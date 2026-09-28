using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Ahlcg.ApiService;

public static class RateLimits
{
    public const string Join = "Join";

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

    /// <summary>
    /// Per-account, not per-IP: a guessed code is tested against every live session at once, so the
    /// account is what has to be scarce. Partitioned on the NameIdentifier claim, which only exists
    /// once <c>UseAuthentication</c> has run — this policy is applied after it in the pipeline.
    /// </summary>
    public static void AddJoinPolicy(this RateLimiterOptions options, LimitOptions limits) =>
        options.AddPolicy(Join, httpContext =>
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

/// <summary>
/// Throttles account creation per IP — cheap accounts are what makes guessing a join code viable,
/// so the limit sits where accounts are made rather than on <c>POST /games/join</c> itself.
/// Acquired from <see cref="AuthEndpoints.LoginAnonymously"/> and the create branch of
/// <see cref="AuthEndpoints.SignIn"/>, never from signing in to or upgrading an existing account.
/// A singleton: the fixed window per IP has to outlive any single request.
/// </summary>
public sealed class AccountCreationLimiter(RateLimits.LimitOptions limits)
{
    private readonly PartitionedRateLimiter<string> _limiter = PartitionedRateLimiter.Create<string, string>(
        ip => RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limits.PermitLimit,
            Window = limits.Window
        }));

    // `FixedWindowRateLimiter` itself rejects a non-positive `PermitLimit` before it ever gets to
    // deny a request, which would turn "throttle to nothing" into a 500 instead of a 429.
    public bool TryAcquire(string ip) => limits.PermitLimit > 0 && _limiter.AttemptAcquire(ip).IsAcquired;
}
