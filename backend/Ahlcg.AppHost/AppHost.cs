using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgresdb").WithPgAdmin();
var database = postgres.AddDatabase("ahlcg");

var apiService =
    builder
        .AddProject<Ahlcg_ApiService>("apiservice")
        .WithHttpHealthCheck("/health")
        .WithReference(database);

builder.AddNpmApp("webfrontend", "../../frontend")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();