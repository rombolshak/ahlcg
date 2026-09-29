using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;

namespace Ahlcg.ApiService;

public class AppUser : IdentityUser
{
    public bool IsAnonymous { get; set; }
    public ICollection<GameMember> Memberships { get; } = [];
}

public static partial class AuthEndpoints
{
    [PublicAPI]
    public record RegisterRequest(
        [Required] [EmailAddress] string Email,
        [Required] string Username,
        [Required] string Password);

    [PublicAPI]
    public record UserDto(string? Email, string? UserName, bool IsAnonymous);
    
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.WithDescription("Authentication flow: \n" +
                              "1) either create an anonymous account via /loginAnonymously and play with it as long " +
                              "as needed on a single device, or sign in directly via /signIn, \n" +
                              "2) call /signIn again when ready to turn an anonymous account into a permanent one — " +
                              "it upgrades the account in place, keeping its data. \n" +
                              "Every route here signs the caller in or out with the persistent " +
                              "AspNetCore.Identity.Application cookie. A 400 from this group carries an IdentityResult " +
                              "body ({ succeeded, errors: [{ code, description }] }), not RFC 7807 ProblemDetails.");

        group.MapGet("info", GetCurrentUser)
            .RequireAuthorization()
            .WithDescription(
                "Returns information of the logged in user. Email is null for an anonymous account, and userName is " +
                "set for every account — a raw GUID for anonymous ones, an opaque identifier rather than a name to " +
                "render; a client displays it by deriving something from it, not by printing it. The account id is " +
                "never returned.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("loginAnonymously", LoginAnonymously)
            .WithDescription(
                "Creates an anonymous user without password. The account gets a GUID user name — an opaque " +
                "identifier, not a name to display as-is — no email and no password. After logout this user cannot " +
                "be logged in again. If the user is already logged in, this method cannot be called. " +
                "Account creation is throttled per IP; exceeding it returns 429.")
            .Produces(StatusCodes.Status429TooManyRequests);

        group.MapPost("signIn", SignIn)
            .WithDescription(
                "Signs in with an email and password, from a logged-out, anonymous or permanent session. " +
                "If the email is already on record, the password is checked against that account and it is signed in. " +
                "If it is not, and the caller holds an anonymous account, that account is upgraded in place — " +
                "it keeps its id and therefore its data, and its existing cookie stays valid. If it is not and the " +
                "caller is logged out, a new permanent account is created. A permanent session cannot create a second " +
                "account: log out first. " +
                "A 403 means the email is on record and the password was wrong, or the account is locked out — the two " +
                "are deliberately indistinguishable, so the route never confirms that an email is registered. " +
                "Account creation (the last branch) is throttled per IP; exceeding it returns 429. Signing in to an " +
                "existing account and upgrading an anonymous one are never throttled here.")
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status429TooManyRequests);

        group.MapPost("logout", Logout)
            .WithDescription(
                "Log out current user. If user is anonymous, it will be deleted with all associated data. " +
                "Authorization is not required, so calling it while logged out is a no-op rather than a 401.");
        return group;
    }

    public static async Task<Results<Ok, BadRequest<IdentityResult>, StatusCodeHttpResult>> LoginAnonymously(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        AccountCreationLimiter limiter,
        HttpContext httpContext,
        ILogger<AppUser> logger)
    {
        var loggedInUser = await userManager.GetUserAsync(principal);
        if (loggedInUser is not null)
        {
            LogAnonymousLoginRefused(logger, loggedInUser.Id);
            return TypedResults.BadRequest(IdentityResult.Failed(
                new IdentityError { Description = "Already logged in" }));
        }

        if (!limiter.TryAcquire(RateLimits.ClientIp(httpContext)))
        {
            LogAccountCreationThrottled(logger);
            return TypedResults.StatusCode(StatusCodes.Status429TooManyRequests);
        }

        var user = new AppUser
        {
            UserName = Guid.NewGuid().ToString(),
            IsAnonymous = true
        };

        var result = await userManager.CreateAsync(user);
        if (!result.Succeeded)
        {
            LogAccountCreationFailed(logger, ErrorCodes(result));
            return TypedResults.BadRequest(result);
        }

        LogAnonymousAccountCreated(logger, user.Id);
        await signInManager.SignInAsync(user, true);
        return TypedResults.Ok();
    }

    /// <summary>
    /// Signs in, registers, and upgrades an anonymous account — one endpoint, because from the
    /// caller's side they are the same intent ("make me this person") and the branch taken is
    /// decided by state the caller does not have: whether the email is already on record.
    /// Splitting them once meant a register button could destroy an anonymous player's games.
    /// </summary>
    public static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>, StatusCodeHttpResult>> SignIn(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        AccountCreationLimiter limiter,
        HttpContext httpContext,
        RegisterRequest request,
        ILogger<AppUser> logger)
    {
        var loggedInUser = await userManager.GetUserAsync(principal);
        var userToLogin = await userManager.FindByEmailAsync(request.Email);

        if (userToLogin is null)
        {
            // A permanent session has nothing to gain from an unknown email: there is no account to
            // sign into, and its own account cannot be upgraded — it already is permanent. Creating
            // one would silently leave the caller signed in as somebody else, with the account they
            // arrived with, and its data, reachable only by remembering to log out first. Whoever
            // wants a second account can log out and ask for it from a logged-out session.
            if (loggedInUser is { IsAnonymous: false })
            {
                LogSecondAccountRefused(logger, loggedInUser.Id);
                return TypedResults.BadRequest(IdentityResult.Failed(
                    new IdentityError { Description = "Already signed in with a permanent account" }));
            }

            return loggedInUser is { IsAnonymous: true }
                ? await UpgradeUserToPermanentAsync(userManager, request, loggedInUser, logger)
                : await CreatePermanentUserAsync(userManager, signInManager, limiter, httpContext, request, logger);
        }

        // CheckPasswordSignInAsync rather than UserManager.CheckPasswordAsync: it records failed
        // attempts and honours the lockout window, which is the only thing standing between this
        // endpoint and unlimited password guessing. It validates without establishing a session,
        // so the SignInAsync below is still needed.
        var checkResult = await signInManager.CheckPasswordSignInAsync(userToLogin, request.Password, true);
        if (!checkResult.Succeeded)
        {
            LogPasswordCheckFailed(logger, userToLogin.Id, checkResult.IsLockedOut);
            return TypedResults.Forbid();
        }

        // TODO transfer all data to the linked account
        if (loggedInUser is { IsAnonymous: true })
        {
            await userManager.DeleteAsync(loggedInUser);
            LogAnonymousAccountDiscarded(logger, loggedInUser.Id, userToLogin.Id);
        }

        await signInManager.SignOutAsync();
        await signInManager.SignInAsync(userToLogin, true);
        LogSignedIn(logger, userToLogin.Id);
        return TypedResults.Ok();
    }

    public static async Task<Results<Ok<UserDto>, UnauthorizedHttpResult>> GetCurrentUser(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        return user is not null
            ? TypedResults.Ok(new UserDto(user.Email, user.UserName, user.IsAnonymous))
            : TypedResults.Unauthorized();
    }

    public static async Task Logout(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        ILogger<AppUser> logger)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            LogLogoutWithoutSession(logger);
            await signInManager.SignOutAsync();
            return;
        }

        if (user.IsAnonymous)
        {
            await userManager.DeleteAsync(user);
            LogAnonymousAccountDeleted(logger, user.Id);
        }

        await signInManager.SignOutAsync();
        LogSignedOut(logger, user.Id);
    }

    /// <summary>
    /// Keeps the anonymous account's id, so everything hanging off it by <c>OwnerId</c> survives.
    /// The session cookie already names this user, so no re-sign-in is needed.
    /// </summary>
    private static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>, StatusCodeHttpResult>>
        UpgradeUserToPermanentAsync(
            UserManager<AppUser> userManager, RegisterRequest request, AppUser loggedInUser, ILogger logger)
    {
        var passwordResult = await userManager.AddPasswordAsync(loggedInUser, request.Password);
        if (!passwordResult.Succeeded)
        {
            LogUpgradeFailed(logger, loggedInUser.Id, ErrorCodes(passwordResult));
            return TypedResults.BadRequest(passwordResult);
        }

        loggedInUser.UserName = request.Username;
        loggedInUser.Email = request.Email;
        loggedInUser.IsAnonymous = false;

        // Anonymous accounts have no password to guess, so lockout is only meaningful from the
        // moment one gains credentials. Set explicitly rather than relying on
        // Lockout.AllowedForNewUsers, which only applies at CreateAsync — this row already exists.
        loggedInUser.LockoutEnabled = true;

        var updateResult = await userManager.UpdateAsync(loggedInUser);
        if (!updateResult.Succeeded)
        {
            LogUpgradeFailed(logger, loggedInUser.Id, ErrorCodes(updateResult));
            return TypedResults.BadRequest(updateResult);
        }

        LogAccountUpgraded(logger, loggedInUser.Id);
        return TypedResults.Ok();
    }

    private static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>, StatusCodeHttpResult>>
        CreatePermanentUserAsync(
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            AccountCreationLimiter limiter,
            HttpContext httpContext,
            RegisterRequest request,
            ILogger logger)
    {
        if (!limiter.TryAcquire(RateLimits.ClientIp(httpContext)))
        {
            LogAccountCreationThrottled(logger);
            return TypedResults.StatusCode(StatusCodes.Status429TooManyRequests);
        }

        var newUser = new AppUser
        {
            UserName = request.Username,
            Email = request.Email,
            IsAnonymous = false,
            LockoutEnabled = true
        };

        var createResult = await userManager.CreateAsync(newUser, request.Password);
        if (!createResult.Succeeded)
        {
            LogAccountCreationFailed(logger, ErrorCodes(createResult));
            return TypedResults.BadRequest(createResult);
        }

        LogPermanentAccountCreated(logger, newUser.Id);
        await signInManager.SignOutAsync();
        await signInManager.SignInAsync(newUser, true);
        return TypedResults.Ok();
    }

    private static string ErrorCodes(IdentityResult result) => string.Join(", ", result.Errors.Select(e => e.Code));

    [LoggerMessage(LogLevel.Information, "User {UserId} asked for an anonymous account while signed in")]
    private static partial void LogAnonymousLoginRefused(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Debug, "Logout called without a signed-in user")]
    private static partial void LogLogoutWithoutSession(ILogger logger);

    [LoggerMessage(LogLevel.Information, "User {UserId} signed out")]
    private static partial void LogSignedOut(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Warning, "Account creation throttled for this client")]
    private static partial void LogAccountCreationThrottled(ILogger logger);

    [LoggerMessage(LogLevel.Warning, "Account creation failed: {ErrorCodes}")]
    private static partial void LogAccountCreationFailed(ILogger logger, string errorCodes);

    [LoggerMessage(LogLevel.Information, "Anonymous account {UserId} created")]
    private static partial void LogAnonymousAccountCreated(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Information, "Permanent account {UserId} created")]
    private static partial void LogPermanentAccountCreated(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Information, "User {UserId} asked for a second account while signed in permanently")]
    private static partial void LogSecondAccountRefused(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Warning, "Password check failed for user {UserId} (locked out: {IsLockedOut})")]
    private static partial void LogPasswordCheckFailed(ILogger logger, string userId, bool isLockedOut);

    [LoggerMessage(LogLevel.Information, "User {UserId} signed in")]
    private static partial void LogSignedIn(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Information, "Anonymous account {UserId} upgraded to permanent")]
    private static partial void LogAccountUpgraded(ILogger logger, string userId);

    [LoggerMessage(LogLevel.Warning, "Upgrade of anonymous account {UserId} failed: {ErrorCodes}")]
    private static partial void LogUpgradeFailed(ILogger logger, string userId, string errorCodes);

    [LoggerMessage(LogLevel.Information,
        "Anonymous account {UserId} deleted on signing in to {SignedInUserId}; its data was not carried over")]
    private static partial void LogAnonymousAccountDiscarded(ILogger logger, string userId, string signedInUserId);

    [LoggerMessage(LogLevel.Information, "Anonymous account {UserId} deleted on logout")]
    private static partial void LogAnonymousAccountDeleted(ILogger logger, string userId);
}