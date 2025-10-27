var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.Ahlcg_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddNpmApp("webfrontend", "../../frontend")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();