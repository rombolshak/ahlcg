using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgresdb").WithPgAdmin();
var database = postgres.AddDatabase("ahlcg");

var migrator =
    builder
        .AddProject<Ahlcg_Migrator>("migrator")
        .WithReference(database)
        .WaitFor(database);

var apiService =
    builder
        .AddProject<Ahlcg_ApiService>("apiservice")
        .WithHttpHealthCheck("/health")
        .WithReference(database)
        .WithReference(migrator)
        .WaitForCompletion(migrator);

builder
    .AddViteApp("webfrontend", "../../frontend", "start")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();