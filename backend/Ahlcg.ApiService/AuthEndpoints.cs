using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;

namespace Ahlcg.ApiService;

public class AppUser : IdentityUser
{
    public bool IsAnonymous { get; set; }
}

public static class AuthEndpoints
{
    [PublicAPI]
    public record RegisterRequest(
        [Required] [EmailAddress] string Email,
        [Required] string Username,
        [Required] string Password);

    [PublicAPI]
    public record UserDto(string? Email, bool IsAnonymous);
    
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.WithDescription("Authentication flow: \n" +
                              "1) either create an anonymous account via /loginAnonymously and play with it as long " +
                              "as needed on a single device, or sign in directly via /signIn, \n" +
                              "2) call /signIn again when ready to turn an anonymous account into a permanent one — " +
                              "it upgrades the account in place, keeping its data.");

        group.MapGet("info", GetCurrentUser)
            .RequireAuthorization()
            .WithDescription("Returns information of the logged in user.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("loginAnonymously", LoginAnonymously)
            .WithDescription(
                "Creates an anonymous user without password. " +
                "After logout this user cannot be logged in again. " +
                "If the user is already logged in, this method cannot be called.");

        group.MapPost("signIn", SignIn)
            .WithDescription(
                "Signs in with an email and password, from a logged-out, anonymous or permanent session. " +
                "If the email is already on record, the password is checked against that account and it is signed in. " +
                "If it is not, and the caller holds an anonymous account, that account is upgraded in place — " +
                "it keeps its id and therefore its data. If it is not and the caller is logged out, a new permanent " +
                "account is created. A permanent session cannot create a second account: log out first.");

        group.MapPost("logout", Logout)
            .WithDescription(
                "Log out current user. If user is anonymous, it will be deleted with all associated data.");
        return group;
    }

    public static async Task<Results<Ok, BadRequest<IdentityResult>>> LoginAnonymously(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager)
    {
        var loggedInUser = await userManager.GetUserAsync(principal);
        if (loggedInUser is not null)
            return TypedResults.BadRequest(IdentityResult.Failed(
                new IdentityError { Description = "Already logged in" }));

        var user = new AppUser
        {
            UserName = Guid.NewGuid().ToString(),
            IsAnonymous = true
        };

        var result = await userManager.CreateAsync(user);
        if (!result.Succeeded)
            return TypedResults.BadRequest(result);
        await signInManager.SignInAsync(user, true);
        return TypedResults.Ok();
    }

    /// <summary>
    /// Signs in, registers, and upgrades an anonymous account — one endpoint, because from the
    /// caller's side they are the same intent ("make me this person") and the branch taken is
    /// decided by state the caller does not have: whether the email is already on record.
    /// Splitting them once meant a register button could destroy an anonymous player's games.
    /// </summary>
    public static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>>> SignIn(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        RegisterRequest request)
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
                return TypedResults.BadRequest(IdentityResult.Failed(
                    new IdentityError { Description = "Already signed in with a permanent account" }));

            return loggedInUser is { IsAnonymous: true }
                ? await UpgradeUserToPermanentAsync(userManager, request, loggedInUser)
                : await CreatePermanentUserAsync(userManager, signInManager, request);
        }

        // CheckPasswordSignInAsync rather than UserManager.CheckPasswordAsync: it records failed
        // attempts and honours the lockout window, which is the only thing standing between this
        // endpoint and unlimited password guessing. It validates without establishing a session,
        // so the SignInAsync below is still needed.
        var checkResult = await signInManager.CheckPasswordSignInAsync(userToLogin, request.Password, true);
        if (!checkResult.Succeeded) return TypedResults.Forbid();

        // TODO transfer all data to the linked account
        if (loggedInUser is { IsAnonymous: true }) await userManager.DeleteAsync(loggedInUser);

        await signInManager.SignOutAsync();
        await signInManager.SignInAsync(userToLogin, true);
        return TypedResults.Ok();
    }

    public static async Task<Results<Ok<UserDto>, UnauthorizedHttpResult>> GetCurrentUser(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        return user is not null
            ? TypedResults.Ok(new UserDto(user.Email, user.IsAnonymous))
            : TypedResults.Unauthorized();
    }

    public static async Task Logout(
        ClaimsPrincipal principal,
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user?.IsAnonymous ?? false) await userManager.DeleteAsync(user);

        await signInManager.SignOutAsync();
    }

    /// <summary>
    /// Keeps the anonymous account's id, so everything hanging off it by <c>OwnerId</c> survives.
    /// The session cookie already names this user, so no re-sign-in is needed.
    /// </summary>
    private static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>>>
        UpgradeUserToPermanentAsync(UserManager<AppUser> userManager, RegisterRequest request, AppUser loggedInUser)
    {
        var passwordResult = await userManager.AddPasswordAsync(loggedInUser, request.Password);
        if (!passwordResult.Succeeded) return TypedResults.BadRequest(passwordResult);

        loggedInUser.UserName = request.Username;
        loggedInUser.Email = request.Email;
        loggedInUser.IsAnonymous = false;

        // Anonymous accounts have no password to guess, so lockout is only meaningful from the
        // moment one gains credentials. Set explicitly rather than relying on
        // Lockout.AllowedForNewUsers, which only applies at CreateAsync — this row already exists.
        loggedInUser.LockoutEnabled = true;

        var updateResult = await userManager.UpdateAsync(loggedInUser);
        if (!updateResult.Succeeded) return TypedResults.BadRequest(updateResult);
        return TypedResults.Ok();
    }

    private static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>>>
        CreatePermanentUserAsync(
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            RegisterRequest request)
    {
        var newUser = new AppUser
        {
            UserName = request.Username,
            Email = request.Email,
            IsAnonymous = false,
            LockoutEnabled = true
        };

        var createResult = await userManager.CreateAsync(newUser, request.Password);
        if (!createResult.Succeeded) return TypedResults.BadRequest(createResult);

        await signInManager.SignOutAsync();
        await signInManager.SignInAsync(newUser, true);
        return TypedResults.Ok();
    }
}