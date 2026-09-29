using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Ahlcg.ApiService;

public static class RateLimits
{
    public const string JoinPolicy = "Join";

    public sealed class LimitOptions
    {
        public int PermitLimit { get; set; } = 5;
        public TimeSpan Window { get; set; } = TimeSpan.FromMinutes(5);
    }

    public sealed class Options
    {
        public LimitOptions Join { get; set; } = new();
        public LimitOptions AccountCreation { get; set; } = new();
    }

    public static void AddJoinPolicy(this RateLimiterOptions options, LimitOptions limits) =>
        options.AddPolicy(JoinPolicy, httpContext =>
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? httpContext.Connection.Id;
            return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limits.PermitLimit,
                Window = limits.Window
            });
        });

    public static string ClientIp(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}

public sealed class AccountCreationLimiter(RateLimits.LimitOptions limits)
{
    private readonly PartitionedRateLimiter<string> _limiter = PartitionedRateLimiter.Create<string, string>(
        ip => RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limits.PermitLimit,
            Window = limits.Window
        }));

    public bool TryAcquire(string ip) => limits.PermitLimit > 0 && _limiter.AttemptAcquire(ip).IsAcquired;
}
