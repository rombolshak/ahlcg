using Ahlcg.ApiService;
using Ahlcg.ServiceDefaults;
using AspNetCore.SignalR.OpenTelemetry;
using Microsoft.Extensions.DependencyInjection.Extensions;
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
builder.Services.TryAddSingleton(TimeProvider.System);

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
app.UseExceptionHandler().UseAuthentication().UseAuthorization();

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