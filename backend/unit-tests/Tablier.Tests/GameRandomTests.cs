using Tablier.Contract;

namespace Tablier.Tests;

public class GameRandomTests
{
    [Fact]
    public void Next_SameSeed_DrawsSameSequence()
    {
        // given
        var first = GameRandom.FromSeed(42);
        var second = GameRandom.FromSeed(42);

        // when
        var firstDraws = Draw(first, 20);
        var secondDraws = Draw(second, 20);

        // then
        Assert.Equal(firstDraws, secondDraws);
    }

    [Fact]
    public void Next_DifferentSeeds_DrawDifferentSequences()
    {
        // given
        var first = GameRandom.FromSeed(1);
        var second = GameRandom.FromSeed(2);

        // when
        var firstDraws = Draw(first, 20);
        var secondDraws = Draw(second, 20);

        // then
        Assert.NotEqual(firstDraws, secondDraws);
    }

    [Fact]
    public void Next_ReturnedRandom_ContinuesSequenceWhileOriginalRepeatsIt()
    {
        // given
        var random = GameRandom.FromSeed(7);

        // when
        var (first, next) = random.Next(0, 1000);
        var (repeated, _) = random.Next(0, 1000);
        var (second, _) = next.Next(0, 1000);

        // then
        Assert.Equal(first, repeated);
        Assert.Equal([first, second], Draw(random, 2));
    }

    [Fact]
    public void Next_ManyDraws_CoverWholeRangeAndNothingOutside()
    {
        // given
        var random = GameRandom.FromSeed(2026);

        // when
        var draws = Draw(random, 600, 1, 7);

        // then
        Assert.Equal([1, 2, 3, 4, 5, 6], draws.Distinct().Order());
    }

    [Fact]
    public void Next_FullIntRange_StaysInBounds()
    {
        // given
        var random = GameRandom.FromSeed(3);

        // when
        var draws = Draw(random, 100, int.MinValue, int.MaxValue);

        // then
        Assert.All(draws, draw => Assert.NotEqual(int.MaxValue, draw));
    }

    [Theory]
    [InlineData(5, 5)]
    [InlineData(6, 5)]
    public void Next_EmptyRange_Throws(int minInclusive, int maxExclusive)
    {
        var random = GameRandom.FromSeed(0);

        Assert.Throws<ArgumentOutOfRangeException>(() => random.Next(minInclusive, maxExclusive));
    }

    [Fact]
    public void Next_AllZeroState_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => default(GameRandom).Next(1, 7));
        Assert.Throws<InvalidOperationException>(() => new GameRandom(0, 0, 0, 0).Next(1, 7));
    }

    private static List<int> Draw(GameRandom random, int count, int minInclusive = 0, int maxExclusive = 1000)
    {
        var draws = new List<int>(count);
        for (var i = 0; i < count; i++)
        {
            (var value, random) = random.Next(minInclusive, maxExclusive);
            draws.Add(value);
        }

        return draws;
    }
}
