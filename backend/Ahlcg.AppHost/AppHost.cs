#pragma warning disable MA0048
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgresdb").WithDataVolume().WithPgAdmin();
var database = postgres.AddDatabase("ahlcg");
var cache = builder.AddValkey("cache");

var migrator = builder
    .AddDotnetProject("migrator", "../Ahlcg.Migrator/Ahlcg.Migrator.csproj")
    .WithReference(database)
    .WaitFor(database);

var apiService = builder
    .AddDotnetProject("apiservice", "../Ahlcg.ApiService/Ahlcg.ApiService.csproj", options =>
        options.LaunchProfileName = "https"
    )
    .WithHttpHealthCheck("/health")
    .WithReference(database)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(migrator)
    .WaitForCompletion(migrator);

builder
    .AddViteApp("webfrontend", "../../frontend", "start")
    .WithNpm(install: true, "ci")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

await builder.Build().RunAsync();
