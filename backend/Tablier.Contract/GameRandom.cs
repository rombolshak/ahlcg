using System.Numerics;

namespace Tablier.Contract;

public readonly record struct GameRandom(ulong S0, ulong S1, ulong S2, ulong S3)
{
    public static GameRandom FromSeed(ulong seed) =>
        new(SplitMix64(ref seed), SplitMix64(ref seed), SplitMix64(ref seed), SplitMix64(ref seed));

    public (int Value, GameRandom Random) Next(int minInclusive, int maxExclusive)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(minInclusive, maxExclusive);
        if ((S0 | S1 | S2 | S3) == 0)
        {
            throw new InvalidOperationException("An all-zero GameRandom never advances; create one with FromSeed.");
        }

        var range = (ulong)((long)maxExclusive - minInclusive);
        var threshold = (0UL - range) % range;
        var random = this;
        while (true)
        {
            (var raw, random) = random.NextUInt64();
            if (raw >= threshold)
            {
                return ((int)(minInclusive + (long)(raw % range)), random);
            }
        }
    }

    private (ulong Value, GameRandom Random) NextUInt64()
    {
        var result = BitOperations.RotateLeft(S1 * 5, 7) * 9;
        var s2 = S2 ^ S0;
        var s3 = S3 ^ S1;
        var s1 = S1 ^ s2;
        var s0 = S0 ^ s3;
        s2 ^= S1 << 17;
        s3 = BitOperations.RotateLeft(s3, 45);
        return (result, new GameRandom(s0, s1, s2, s3));
    }

    private static ulong SplitMix64(ref ulong state)
    {
        var z = state += 0x9E3779B97F4A7C15;
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EB;
        return z ^ (z >> 31);
    }
}
