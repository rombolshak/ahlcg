using System.Text.Json.Serialization;
using Ahlcg.ApiService;
using Ahlcg.ServiceDefaults;
using AspNetCore.SignalR.OpenTelemetry;
using Microsoft.Extensions.DependencyInjection.Extensions;
using OpenTelemetry.Metrics;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
builder
    .AddServiceDefaults()
    .AddNpgsqlDbContext<ApplicationDbContext>("ahlcg");

builder.Services
    .AddProblemDetails()
    .AddOpenApi()
    .AddValidation();

builder.Services.AddSignalR()
    .AddHubInstrumentation()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton<GameSessions>();
builder.Services.AddOpenTelemetry().WithMetrics(metrics => metrics.AddMeter(GameSessions.MeterName));
builder.Services.TryAddSingleton(TimeProvider.System);

var rateLimits = builder.Configuration.GetSection("RateLimits").Get<RateLimits.Options>() ?? new RateLimits.Options();
builder.Services.AddSingleton(new AccountCreationLimiter(rateLimits.AccountCreation));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddJoinPolicy(rateLimits.Join);
});

builder.Services
    .AddIdentityApiEndpoints<AppUser>()
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.ExpireTimeSpan = TimeSpan.FromDays(90);
    options.SlidingExpiration = true;
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

var app = builder.Build();
app.UseExceptionHandler().UseAuthentication().UseAuthorization().UseRateLimiter();

app.MapDefaultEndpoints();
app.MapHub<GameHub>("/game");
app.MapGroup("auth").MapAuthEndpoints().WithTags("Auth");
app.MapGroup("games").MapGameEndpoints().WithTags("Games");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseDeveloperExceptionPage();
}

app.Run();