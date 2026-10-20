namespace Tablier;

#pragma warning disable MA0048
public enum ExitReason
{
    NotAMember,
}
#pragma warning restore MA0048

public interface IGameClient
{
    Task MemberConnected(string userId);

    Task MemberDisconnected(string userId);

    // The method name is the SignalR wire name the frontend listens on.
#pragma warning disable CA1716
    Task Exit(ExitReason reason);
#pragma warning restore CA1716
}
