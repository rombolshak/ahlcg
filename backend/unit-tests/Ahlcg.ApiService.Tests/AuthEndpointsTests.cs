using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Moq;

namespace Ahlcg.ApiService.Tests;

public class AuthEndpointsTests
{
    [Fact]
    public async Task LoginAnonymously_NotLoggedIn_CreatesAnonymousAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LoginAnonymously(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object);

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(It.Is<AppUser>(p => p.IsAnonymous == true)));
        signInManager.Verify(manager => manager.SignInAsync(It.Is<AppUser>(p => p.IsAnonymous == true), true));
    }

    [Fact]
    public async Task LoginAnonymously_LoggedIn_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LoginAnonymously(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object);

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task LoginAnonymously_FailedToCreateUser_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();
        userManager
            .Setup(m => m.CreateAsync(It.IsAny<AppUser>()))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "test_error" }));

        var result = await AuthEndpoints.LoginAnonymously(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object);

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(It.IsAny<AppUser>()));
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    // `SignIn` covers three intents that differ only by state the caller cannot see — whether the
    // email is already on record, and what kind of session they hold. The cases below are the whole
    // truth table; the one that earns the endpoint its shape is
    // `SignIn_AnonymousUnknownEmail_UpgradesAccountInPlace`, which is what stops a register button
    // from destroying an anonymous player's games.

    [Fact]
    public async Task SignIn_LoggedOutKnownEmailCorrectPassword_SignsInExistingAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);

        // lockoutOnFailure: true — without it a wrong password costs an attacker nothing
        signInManager.Verify(manager =>
            manager.CheckPasswordSignInAsync(It.Is<AppUser>(u => u.Email == "test@test.com"), "P@ssw0rd", true));
        userManager.Verify(manager => manager.CheckPasswordAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.Is<AppUser>(u => u.Email == "test@test.com"), true));
    }

    [Fact]
    public async Task SignIn_KnownEmailLockedOut_ReturnsForbid()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();
        signInManager
            .Setup(m => m.CheckPasswordSignInAsync(It.IsAny<AppUser>(), It.IsAny<string>(), true))
            .ReturnsAsync(SignInResult.LockedOut);

        var result = await AuthEndpoints.SignIn(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw0rd"));

        // A locked-out account is indistinguishable from a wrong password to the caller, which is
        // deliberate — it keeps the endpoint from confirming that an email is registered.
        Assert.IsType<ForbidHttpResult>(result.Result);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_KnownEmailWrongPassword_ReturnsForbid()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw"));

        Assert.IsType<ForbidHttpResult>(result.Result);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_AnonymousKnownEmailWrongPassword_KeepsAnonymousAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw"));

        Assert.IsType<ForbidHttpResult>(result.Result);
        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_LoggedOutUnknownEmail_CreatesPermanentAccountAndSignsIn()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("new@test.com", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(
            It.Is<AppUser>(u => u.Email == "new@test.com" && u.IsAnonymous == false && u.LockoutEnabled), "P@ssw0rd"));
        signInManager.Verify(manager => manager.SignInAsync(It.Is<AppUser>(u => u.Email == "new@test.com"), true));
    }

    [Fact]
    public async Task SignIn_LoggedOutUnknownEmailCreateFails_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("new@test.com", "user", "P@ssw"));

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_AnonymousUnknownEmail_UpgradesAccountInPlace()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("email@contoso.co", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), "P@ssw0rd"));

        // Lockout matters only once the account has a password to guess, so the upgrade is where it
        // gets switched on — AllowedForNewUsers does not reach a row that already exists.
        userManager.Verify(manager => manager.UpdateAsync(
            It.Is<AppUser>(u => u.Email == "email@contoso.co" && u.IsAnonymous == false && u.LockoutEnabled)));

        // The account keeps its id, so anything hanging off OwnerId survives — and the existing
        // session cookie already names it, so no re-sign-in.
        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
        userManager.Verify(manager => manager.CreateAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_AnonymousUnknownEmailWithShortPassword_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("email@contoso.co", "user", "P@ssw"));

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), "P@ssw"));
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_AnonymousUnknownEmailWithBadEmail_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("bad_mail", "user", "P@ssw0rd"));

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), "P@ssw0rd"));
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()));
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_AnonymousKnownEmailCorrectPassword_DeletesAnonymousAndSignsInExisting()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()), Times.Never);
        userManager.Verify(manager => manager.DeleteAsync(It.Is<AppUser>(u => u.Id == AnonymousUser1)));
        signInManager.Verify(manager => manager.SignInAsync(It.Is<AppUser>(u => u.Email == "test@test.com"), true));
    }

    [Fact]
    public async Task SignIn_PermanentSessionUnknownEmail_ReturnsBadRequestWithoutCreatingAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            PermanentPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("new@test.com", "user", "P@ssw0rd"));

        // There is nothing to sign into and nothing to upgrade, so creating an account here would
        // only leave the caller signed in as someone else, with the account they arrived with
        // reachable again only by logging out.
        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.CreateAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()), Times.Never);
        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task SignIn_PermanentSessionKnownEmail_StillSignsInThatAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.SignIn(
            PermanentPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw0rd"));

        // Only account *creation* is barred from a permanent session — switching to an account that
        // exists is still an ordinary sign-in, and still costs a password check.
        Assert.IsType<Ok>(result.Result);
        signInManager.Verify(manager =>
            manager.CheckPasswordSignInAsync(It.Is<AppUser>(u => u.Email == "test@test.com"), "P@ssw0rd", true));
        signInManager.Verify(manager => manager.SignInAsync(It.Is<AppUser>(u => u.Email == "test@test.com"), true));
        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
    }

    [Fact]
    public async Task GetCurrentUser_NotLoggedIn_ReturnsUnauthorized()
    {
        var userManager = GetMockUserManager();

        var result = await AuthEndpoints.GetCurrentUser(
            new ClaimsPrincipal(new ClaimsIdentity()),
            userManager.Object);

        Assert.IsType<UnauthorizedHttpResult>(result.Result);
    }

    [Fact]
    public async Task GetCurrentUser_LoggedInAsNonExistentUser_ReturnsUnauthorized()
    {
        var userManager = GetMockUserManager();

        var result = await AuthEndpoints.GetCurrentUser(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())])),
            userManager.Object);

        Assert.IsType<UnauthorizedHttpResult>(result.Result);
    }

    [Fact]
    public async Task GetCurrentUser_LoggedIn_ReturnsInfo()
    {
        var userManager = GetMockUserManager();

        var result = await AuthEndpoints.GetCurrentUser(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, AnonymousUser1)])),
            userManager.Object);

        Assert.IsType<Ok<AuthEndpoints.UserDto>>(result.Result);
        var user = ((Ok<AuthEndpoints.UserDto>)result.Result).Value;
        Assert.True(user?.IsAnonymous);
        Assert.False(string.IsNullOrEmpty(user?.UserName));
    }

    [Fact]
    public async Task GetCurrentUser_LoggedInAsPermanent_ReturnsEmailAndUserName()
    {
        var userManager = GetMockUserManager();

        var result = await AuthEndpoints.GetCurrentUser(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, PermanentUser)])),
            userManager.Object);

        Assert.IsType<Ok<AuthEndpoints.UserDto>>(result.Result);
        var user = ((Ok<AuthEndpoints.UserDto>)result.Result).Value;
        Assert.Equal("test@test.com", user?.Email);
        Assert.Equal("test user", user?.UserName);
    }

    [Fact]
    public async Task Logout_LoggedInAsAnonymous_DeletesAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        await AuthEndpoints.Logout(AnonymousPrincipal1, userManager.Object, signInManager.Object);

        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()));
        signInManager.Verify(manager => manager.SignOutAsync());
    }

    [Fact]
    public async Task Logout_LoggedInAsPermanent_DoesNotDeleteAccount()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        await AuthEndpoints.Logout(PermanentPrincipal, userManager.Object, signInManager.Object);

        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignOutAsync());
    }

    [Fact]
    public async Task Logout_NotLoggedIn_NothingHappens()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        await AuthEndpoints.Logout(NotAuthenticatedPrincipal, userManager.Object, signInManager.Object);

        userManager.Verify(manager => manager.DeleteAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignOutAsync());
    }

    private static Mock<UserManager<AppUser>> GetMockUserManager()
    {
        var mock = new Mock<UserManager<AppUser>>(
            new Mock<IUserStore<AppUser>>().Object,
#pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type.
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);
#pragma warning restore CS8625 // Cannot convert null literal to non-nullable reference type.

        var permanentUser = new AppUser
        {
            Id = PermanentUser, UserName = "test user", Email = "test@test.com", IsAnonymous = false
        };

        mock
            .Setup(m => m.GetUserAsync(
                It.Is<ClaimsPrincipal>(p => p.HasClaim(ClaimTypes.NameIdentifier, AnonymousUser1))))
            .ReturnsAsync(
                new AppUser { Id = AnonymousUser1, UserName = Guid.NewGuid().ToString(), IsAnonymous = true });
        mock
            .Setup(m => m.GetUserAsync(
                It.Is<ClaimsPrincipal>(p => p.HasClaim(ClaimTypes.NameIdentifier, AnonymousUser2))))
            .ReturnsAsync(
                new AppUser { Id = AnonymousUser2, UserName = Guid.NewGuid().ToString(), IsAnonymous = true });
        mock
            .Setup(m => m.GetUserAsync(
                It.Is<ClaimsPrincipal>(p => p.HasClaim(ClaimTypes.NameIdentifier, PermanentUser))))
            .ReturnsAsync(
                permanentUser);
        mock.Setup(m => m.FindByEmailAsync("test@test.com")).ReturnsAsync(permanentUser);

        mock.Setup(m => m.CreateAsync(It.IsAny<AppUser>())).ReturnsAsync(IdentityResult.Success);
        mock
            .Setup(m => m.CreateAsync(It.IsAny<AppUser>(), It.Is<string>(s => s.Length >= 6)))
            .ReturnsAsync(IdentityResult.Success);
        mock
            .Setup(m => m.CreateAsync(It.IsAny<AppUser>(), It.Is<string>(s => s.Length < 6)))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "password_short" }));
        mock
            .Setup(m => m.AddPasswordAsync(It.IsAny<AppUser>(), It.Is<string>(s => s.Length >= 6)))
            .ReturnsAsync(IdentityResult.Success);
        mock
            .Setup(m => m.AddPasswordAsync(It.IsAny<AppUser>(), It.Is<string>(s => s.Length < 6)))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "password_short" }));
        mock
            .Setup(m => m.UpdateAsync(It.Is<AppUser>(u => u.Email == "bad_mail")))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "email_invalid" }));
        mock
            .Setup(m => m.UpdateAsync(It.Is<AppUser>(u => u.Email != "bad_mail")))
            .ReturnsAsync(IdentityResult.Success);
        return mock;
    }

    private static Mock<SignInManager<AppUser>> GetMockSignInManager()
    {
        var mock = new Mock<SignInManager<AppUser>>(
            GetMockUserManager().Object,
            new Mock<IHttpContextAccessor>().Object,
            new Mock<IUserClaimsPrincipalFactory<AppUser>>().Object,
#pragma warning disable CS8625 // Cannot convert null literal to non-nullable reference type.
            null,
            null,
            null,
            null);
#pragma warning restore CS8625 // Cannot convert null literal to non-nullable reference type.

        // The password check goes through SignInManager, not UserManager, so that failures count
        // towards lockout. `lockoutOnFailure` is matched explicitly: passing false here would still
        // authenticate correctly and silently drop the rate limiting.
        mock
            .Setup(m => m.CheckPasswordSignInAsync(It.IsAny<AppUser>(), "P@ssw0rd", true))
            .ReturnsAsync(SignInResult.Success);
        mock
            .Setup(m => m.CheckPasswordSignInAsync(It.IsAny<AppUser>(), It.Is<string>(s => s != "P@ssw0rd"), true))
            .ReturnsAsync(SignInResult.Failed);
        return mock;
    }

    private const string AnonymousUser1 = "4139F1EA-4901-4253-A391-021FAA001677";
    private const string AnonymousUser2 = "D0A6B608-AE28-4AAF-BC4B-D25D6E93187A";
    private const string PermanentUser = "D1BC7D14-5B53-4508-8784-15A678021C1F";

    private static readonly ClaimsPrincipal NotAuthenticatedPrincipal = new(new ClaimsIdentity());

    private static readonly ClaimsPrincipal AnonymousPrincipal1 =
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, AnonymousUser1)]));

    private static readonly ClaimsPrincipal AnonymousPrincipal2 =
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, AnonymousUser2)]));

    private static readonly ClaimsPrincipal PermanentPrincipal =
        new(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, PermanentUser)]));
}