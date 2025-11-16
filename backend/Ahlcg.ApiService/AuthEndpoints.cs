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
                              "1) create anonymous account first via /loginAnonymously, \n" +
                              "2) use it as long as needed on single device, \n" +
                              "3) call /linkCredentials when needed to create permanent account.");

        group.MapGet("info", GetCurrentUser)
            .RequireAuthorization()
            .WithDescription("Returns information of the logged in user.")
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("loginAnonymously", LoginAnonymously)
            .WithDescription(
                "Creates an anonymous user without password. " +
                "After logout this user cannot be logged in again. " +
                "If the user is already logged in, this method cannot be called.");

        group.MapPost("linkCredentials", LinkCredentials)
            .RequireAuthorization()
            .WithDescription(
                "Links permanent account for current anonymous one. " +
                "If user with a specified email is not found, then the current anonymous account upgrades to permanent." +
                "If user with a specified email already exists, then password is checked, " +
                "on success current anonymous account will be deleted, transferring all associated data to the permanent");

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

    public static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>, BadRequest<SignInResult>>>
        LinkCredentials(
            ClaimsPrincipal principal,
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            RegisterRequest request)
    {
        var loggedInUser = await userManager.GetUserAsync(principal);
        if (loggedInUser is null or { IsAnonymous: false })
            return TypedResults.BadRequest(IdentityResult.Failed(new IdentityError
                { Description = "Account is not anonymous and cannot be linked to another" }));

        var userToLogin = await userManager.FindByEmailAsync(request.Email);
        if (userToLogin is null) return await UpgradeUserToPermanentAsync(userManager, request, loggedInUser);

        var checkResult = await userManager.CheckPasswordAsync(userToLogin, request.Password);
        if (!checkResult) return TypedResults.Forbid();

        // TODO transfer all data to the linked account
        await userManager.DeleteAsync(loggedInUser);
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

    private static async Task<Results<Ok, ForbidHttpResult, BadRequest<IdentityResult>, BadRequest<SignInResult>>>
        UpgradeUserToPermanentAsync(UserManager<AppUser> userManager, RegisterRequest request, AppUser loggedInUser)
    {
        var passwordResult = await userManager.AddPasswordAsync(loggedInUser, request.Password);
        if (!passwordResult.Succeeded) return TypedResults.BadRequest(passwordResult);

        loggedInUser.UserName = request.Username;
        loggedInUser.Email = request.Email;
        loggedInUser.IsAnonymous = false;

        var updateResult = await userManager.UpdateAsync(loggedInUser);
        if (!updateResult.Succeeded) return TypedResults.BadRequest(updateResult);
        return TypedResults.Ok();
    }
}