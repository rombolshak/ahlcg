namespace Ahlcg.ApiService.IntegrationTests;

public sealed class AppFixture : AppFixtureBase
{
    protected override int? AccountCreationPermitLimit => 1000;
}

#pragma warning disable MA0048
[CollectionDefinition(Name)]
public sealed class AppCollection : ICollectionFixture<AppFixture>
{
    public const string Name = "App";
}

public sealed class DefaultLimitsAppFixture : AppFixtureBase;

[CollectionDefinition(Name)]
public sealed class DefaultLimitsAppCollection : ICollectionFixture<DefaultLimitsAppFixture>
{
    public const string Name = "DefaultLimitsApp";
}
#pragma warning restore MA0048
