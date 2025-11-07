using Microsoft.AspNetCore.SignalR;

namespace Ahlcg.ApiService;

public class GameHub : Hub
{
    public async Task Ping() => await Clients.Caller.SendAsync("ping", DateTime.UtcNow);
}