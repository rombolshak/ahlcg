using System.Threading.RateLimiting;

namespace Tablier;

public sealed class AccountCreationLimiter(RateLimits.LimitOptions limits)
{
    private readonly PartitionedRateLimiter<string> _limiter = PartitionedRateLimiter.Create<string, string>(ip =>
        RateLimitPartition.GetFixedWindowLimiter(
            ip,
            _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.PermitLimit, Window = limits.Window }
        )
    );

    public bool TryAcquire(string ip) => limits.PermitLimit > 0 && _limiter.AttemptAcquire(ip).IsAcquired;
}
