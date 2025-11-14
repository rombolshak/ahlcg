using Ahlcg.ApiService;
using Ahlcg.ServiceDefaults;
using AspNetCore.SignalR.OpenTelemetry;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
builder
    .AddServiceDefaults()
    .AddNpgsqlDbContext<ApplicationDbContext>("ahlcg");

builder.Services
    .AddProblemDetails()
    .AddOpenApi()
    .AddValidation();

builder.Services.AddSignalR().AddHubInstrumentation();

builder.Services
    .AddIdentityApiEndpoints<AppUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.ConfigureApplicationCookie(options => options.ExpireTimeSpan = TimeSpan.FromDays(90));

var app = builder.Build();
app.UseExceptionHandler().UseAuthentication().UseAuthorization();

app.MapDefaultEndpoints();
app.MapHub<GameHub>("/game");
app.MapGroup("auth").MapAuthEndpoints().WithTags("Auth");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseDeveloperExceptionPage();
}

app.Run();