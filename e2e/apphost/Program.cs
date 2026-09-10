using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Postgres;
using Aspire.Hosting.Testing;

var builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Ahlcg_AppHost>();

foreach (var resource in builder.Resources.OfType<PgAdminContainerResource>().ToList())
{
    builder.Resources.Remove(resource);
}

// Strips WithDataVolume()'s mount so this suite's Postgres never touches the dev volume -
// see "Ephemeral Postgres" in docs/testing.md#end-to-end for the full reasoning.
var postgres = builder.Resources.Single(r => r.Name == "postgresdb");
foreach (var mount in postgres.Annotations.OfType<ContainerMountAnnotation>().ToList())
{
    postgres.Annotations.Remove(mount);
}

await using var app = await builder.BuildAsync();
await app.StartAsync();

await app.ResourceNotifications.WaitForResourceHealthyAsync("apiservice");
await app.ResourceNotifications.WaitForResourceHealthyAsync("webfrontend");

var webfrontendUrl = app.GetEndpoint("webfrontend", "http");
Console.Out.WriteLine($"E2E_WEBFRONTEND_URL={webfrontendUrl}");
Console.Out.Flush();

// The Playwright suite closes stdin as its shutdown signal; ReadLineAsync returns null on EOF,
// after which control falls through to `app`'s DisposeAsync above.
await Console.In.ReadLineAsync();
