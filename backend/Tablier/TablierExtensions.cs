using System.Text.Json.Serialization;
using AspNetCore.SignalR.OpenTelemetry;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Tablier.Auth;
using Tablier.Contract;
using Tablier.Data;
using Tablier.Engine;
using Tablier.Engine.History;
using Tablier.Engine.History.Cache;
using Tablier.Engine.History.Cleanup;
using Tablier.Games;
using Tablier.Telemetry;

namespace Tablier;

public static class TablierExtensions
{
    public static TBuilder AddTablier<TBuilder>(
        this TBuilder builder,
        string connectionName,
        string cacheConnectionName
    )
        where TBuilder : IHostApplicationBuilder
    {
        builder.AddNpgsqlDbContext<ApplicationDbContext>(connectionName);
        builder.AddRedisClient(cacheConnectionName);
        builder.Services.AddOptions<GameHistoryCacheOptions>().BindConfiguration(GameHistoryCacheOptions.SectionName);
        builder
            .Services.AddOptions<GameHistoryCleanupOptions>()
            .BindConfiguration(GameHistoryCleanupOptions.SectionName)
            .Validate(o => o.Interval > TimeSpan.Zero)
            .ValidateOnStart();
        builder.Services.AddScoped<GameHistoryCleanup>();
        builder.Services.AddHostedService<GameHistoryCleanupService>();

        builder.Services.AddProblemDetails().AddOpenApi().AddValidation();

        builder
            .Services.AddSignalR()
            .AddHubInstrumentation()
            .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
        builder.Services.AddSingleton<GameSessions>();
        builder.Services.AddKeyedScoped(typeof(IGameHistory<>), "store", typeof(GameHistory<>));
        builder.Services.AddKeyedScoped(typeof(IGameHistory<>), "cached", typeof(CachedGameHistory<>));
        builder.Services.AddScoped(typeof(IGameHistory<>), typeof(MeteredGameHistory<>));
        builder.Services.AddSingleton<TablierMetrics>();
        builder
            .Services.AddOpenTelemetry()
            .WithMetrics(metrics => metrics.AddMeter(GameSessions.MeterName, TablierMetrics.MeterName));
        builder.Services.TryAddSingleton(TimeProvider.System);

        var rateLimits =
            builder.Configuration.GetSection("RateLimits").Get<RateLimits.Options>() ?? new RateLimits.Options();
        builder.Services.AddSingleton(new AccountCreationLimiter(rateLimits.AccountCreation));
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddJoinPolicy(rateLimits.Join);
            options.LogRejections();
        });

        builder.Services.AddIdentityApiEndpoints<AppUser>().AddEntityFrameworkStores<ApplicationDbContext>();
        builder.Services.ConfigureApplicationCookie(options =>
        {
            options.ExpireTimeSpan = TimeSpan.FromDays(90);
            options.SlidingExpiration = true;
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
        });

        return builder;
    }

    public static IServiceCollection AddGameEngine<TConfiguration, TState, TView>(this IServiceCollection services)
        where TState : ISchemaVersioned =>
        services
            .AddScoped(provider =>
            {
                var metrics = provider.GetRequiredService<TablierMetrics>();
                var time = provider.GetRequiredService<TimeProvider>();
                return new GameRules<TConfiguration, TState, TView>(
                    new MeteredGameConfigurator<TConfiguration, TState>(
                        provider.GetRequiredService<IGameConfigurator<TConfiguration, TState>>(),
                        metrics,
                        time
                    ),
                    new MeteredGameStateProcessor<TState>(
                        provider.GetRequiredService<IGameStateProcessor<TState>>(),
                        metrics,
                        time
                    ),
                    new MeteredGameViewProjector<TState, TView>(
                        provider.GetRequiredService<IGameViewProjector<TState, TView>>(),
                        metrics,
                        time
                    )
                );
            })
            .AddScoped<GameEngine<TConfiguration, TState, TView>>()
            .AddScoped<IGameEngine>(provider => new MeteredGameEngine(
                provider.GetRequiredService<GameEngine<TConfiguration, TState, TView>>(),
                provider.GetRequiredService<TablierMetrics>(),
                provider.GetRequiredService<TimeProvider>()
            ));

    public static WebApplication MapTablier(this WebApplication app)
    {
        app.UseAuthentication().UseAuthorization().UseRateLimiter();

        app.MapHub<GameHub>("/game");
        app.MapGroup("auth").MapAuthEndpoints().WithTags("Auth");
        app.MapGroup("games").MapGameEndpoints().WithTags("Games");

        return app;
    }
}
