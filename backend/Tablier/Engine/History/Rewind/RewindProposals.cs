using System.Text.Json;
using StackExchange.Redis;

namespace Tablier.Engine.History.Rewind;

public sealed class RewindProposals(IConnectionMultiplexer redis)
{
    private const string CompareExchange = """
        local current = redis.call('GET', KEYS[1])
        if (current or '') ~= ARGV[1] then return 0 end
        if ARGV[2] == '' then redis.call('DEL', KEYS[1])
        else redis.call('SET', KEYS[1], ARGV[2]) end
        return 1
        """;

    public async Task<RewindProposal?> Get(Guid gameId)
    {
        var value = await redis.GetDatabase().StringGetAsync(GetKey(gameId));
        return value.HasValue ? JsonSerializer.Deserialize<RewindProposal>((string)value!) : null;
    }

    public async Task<bool> Exchange(Guid gameId, RewindProposal? expected, RewindProposal? replacement) =>
        (int)
            await redis
                .GetDatabase()
                .ScriptEvaluateAsync(CompareExchange, [GetKey(gameId)], [Serialize(expected), Serialize(replacement)])
        == 1;

    private static string Serialize(RewindProposal? proposal) =>
        proposal is null ? string.Empty : JsonSerializer.Serialize(proposal);

    private static string GetKey(Guid gameId) => $"tablier:game:{gameId}:rewind";
}
