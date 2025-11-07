using Ahlcg.ApiService;
using Ahlcg.ServiceDefaults;
using AspNetCore.SignalR.OpenTelemetry;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);
builder
    .AddServiceDefaults()
    .AddNpgsqlDbContext<ApplicationDbContext>("ahlcg");

builder.Services
    .AddProblemDetails()
    .AddOpenApi()
    .AddAuthorization()
    .AddSignalR().AddHubInstrumentation();

builder.Services
    .AddIdentityApiEndpoints<IdentityUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();

var app = builder.Build();
app.UseExceptionHandler();
app.MapDefaultEndpoints();
app.MapHub<GameHub>("/game");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseDeveloperExceptionPage();
}

app.Run();