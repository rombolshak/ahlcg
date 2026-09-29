using System.Globalization;
using System.Net;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Postgres;
using Aspire.Hosting.Testing;
using Microsoft.EntityFrameworkCore;

// The apiservice launch profile binds fixed ports, so two AppHosts must never run at once.
[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace Ahlcg.ApiService.IntegrationTests;

/// <summary>
/// Starts the real AppHost (Postgres, migrator, apiservice) once for the whole collection and
/// drives it over real HTTP. The webfrontend (no Node in CI) and pgAdmin (dev convenience only)
/// resources are removed before the app starts.
/// </summary>
public abstract class AppFixtureBase : IAsyncLifetime
{
    private DistributedApplication _app = null!;
    private Uri _apiBaseAddress = null!;

    public string ConnectionString { get; private set; } = null!;

    public Uri ApiBaseAddress => _apiBaseAddress;

    protected virtual int? AccountCreationPermitLimit => null;

    public async Task InitializeAsync()
    {
        var builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Ahlcg_AppHost>();

        foreach (var resource in builder.Resources
                     .Where(r => r.Name.StartsWith("webfrontend", StringComparison.Ordinal)
                                 || r is PgAdminContainerResource)
                     .ToList())
        {
            builder.Resources.Remove(resource);
        }

        if (AccountCreationPermitLimit is { } permitLimit)
        {
            var apiService = builder.Resources.OfType<ProjectResource>().Single(r => r.Name == "apiservice");
            builder.CreateResourceBuilder(apiService)
                .WithEnvironment("RateLimits__AccountCreation__PermitLimit", permitLimit.ToString(CultureInfo.InvariantCulture));
        }

        _app = await builder.BuildAsync();
        await _app.StartAsync();
        await _app.ResourceNotifications.WaitForResourceHealthyAsync("apiservice");

        _apiBaseAddress = _app.GetEndpoint("apiservice", "https");
        ConnectionString = await _app.GetConnectionStringAsync("ahlcg")
                            ?? throw new InvalidOperationException("No connection string for 'ahlcg'.");
    }

    public async Task DisposeAsync()
    {
        await _app.DisposeAsync();
    }

    /// <summary>
    /// A fresh client with its own cookie jar, talking HTTPS to the real apiservice. Certificate
    /// validation is disabled: the dev cert is trusted locally but never in CI, and the auth
    /// cookie's Secure attribute means it cannot travel over plain HTTP instead.
    /// </summary>
    public HttpClient CreateClient() => CreateClient(new CookieContainer());

    /// <summary>
    /// As <see cref="CreateClient()"/>, but over a caller-supplied cookie jar, so a SignalR
    /// <c>HubConnection</c> can be given the same authenticated session the client signed in with.
    /// </summary>
    public HttpClient CreateClient(CookieContainer cookies)
    {
        var handler = new HttpClientHandler
        {
            UseCookies = true,
            CookieContainer = cookies,
            ServerCertificateCustomValidationCallback =
                HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        };
        return new HttpClient(handler) { BaseAddress = _apiBaseAddress };
    }

    /// <summary>A fresh, untracked context against the real Postgres the app is running against.</summary>
    public ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
        return new ApplicationDbContext(options);
    }
}

public sealed class AppFixture : AppFixtureBase
{
    protected override int? AccountCreationPermitLimit => 1000;
}

[CollectionDefinition(Name)]
public sealed class AppCollection : ICollectionFixture<AppFixture>
{
    public const string Name = "App";
}

public sealed class DefaultLimitsAppFixture : AppFixtureBase;

[CollectionDefinition(Name)]
public sealed class DefaultLimitsAppCollection : ICollectionFixture<DefaultLimitsAppFixture>
{
    public const string Name = "DefaultLimitsApp";
}
