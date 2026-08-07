using System.Net;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Postgres;
using Aspire.Hosting.Testing;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService.IntegrationTests;

/// <summary>
/// Starts the real AppHost (Postgres, migrator, apiservice) once for the whole collection and
/// drives it over real HTTP. The webfrontend (no Node in CI) and pgAdmin (dev convenience only)
/// resources are removed before the app starts.
/// </summary>
public sealed class AppFixture : IAsyncLifetime
{
    private DistributedApplication _app = null!;
    private Uri _apiBaseAddress = null!;

    public string ConnectionString { get; private set; } = null!;

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
    public HttpClient CreateClient()
    {
        var handler = new HttpClientHandler
        {
            UseCookies = true,
            CookieContainer = new CookieContainer(),
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

[CollectionDefinition(Name)]
public sealed class AppCollection : ICollectionFixture<AppFixture>
{
    public const string Name = "App";
}
