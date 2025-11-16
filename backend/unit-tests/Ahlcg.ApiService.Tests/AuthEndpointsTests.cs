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

    [Fact]
    public async Task LinkCredentials_NotLoggedIn_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LinkCredentials(
            NotAuthenticatedPrincipal,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("email@contoso.co", "user", "P@ssw0rd"));

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task LinkCredentials_NonExistentUser_UpgradesCurrentAccountToPermanent()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LinkCredentials(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("email@contoso.co", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), "P@ssw0rd"));
        userManager.Verify(manager =>
            manager.UpdateAsync(It.Is<AppUser>(u => u.Email == "email@contoso.co" && u.IsAnonymous == false)));
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task LinkCredentials_NonExistentUserWithShortPassword_ReturnsBadRequest()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LinkCredentials(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("email@contoso.co", "user", "P@ssw"));

        Assert.IsType<BadRequest<IdentityResult>>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), "P@ssw"));
        userManager.Verify(
            manager =>
                manager.UpdateAsync(It.IsAny<AppUser>()),
            Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task LinkCredentials_ExistentUserWithInvalidPassword_ReturnsForbid()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LinkCredentials(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw"));

        Assert.IsType<ForbidHttpResult>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()), Times.Never);
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true), Times.Never);
    }

    [Fact]
    public async Task LinkCredentials_ExistentUserWithCorrectPassword_MergesCurrentAccountWithPermanentAndReSignIn()
    {
        var userManager = GetMockUserManager();
        var signInManager = GetMockSignInManager();

        var result = await AuthEndpoints.LinkCredentials(
            AnonymousPrincipal1,
            userManager.Object,
            signInManager.Object,
            new AuthEndpoints.RegisterRequest("test@test.com", "user", "P@ssw0rd"));

        Assert.IsType<Ok>(result.Result);
        userManager.Verify(manager => manager.AddPasswordAsync(It.IsAny<AppUser>(), It.IsAny<string>()), Times.Never);
        userManager.Verify(manager => manager.UpdateAsync(It.IsAny<AppUser>()), Times.Never);
        userManager.Verify(manager => manager.DeleteAsync(It.Is<AppUser>(u => u.IsAnonymous)));
        signInManager.Verify(manager => manager.SignInAsync(It.IsAny<AppUser>(), true));
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
        Assert.True(((Ok<AuthEndpoints.UserDto>)result.Result).Value?.IsAnonymous);
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

    private static Mock<UserManager<AppUser>> GetMockUserManager()
    {
        var mock = new Mock<UserManager<AppUser>>(
            new Mock<IUserStore<AppUser>>().Object,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);

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
        mock.Setup(m => m.CheckPasswordAsync(It.IsAny<AppUser>(), "P@ssw0rd")).ReturnsAsync(true);
        return mock;
    }

    private static Mock<SignInManager<AppUser>> GetMockSignInManager()
    {
        var mock = new Mock<SignInManager<AppUser>>(
            GetMockUserManager().Object,
            new Mock<IHttpContextAccessor>().Object,
            new Mock<IUserClaimsPrincipalFactory<AppUser>>().Object,
            null,
            null,
            null,
            null);
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