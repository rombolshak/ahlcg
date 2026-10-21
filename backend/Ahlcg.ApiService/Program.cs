using Ahlcg.Rules.Fixture;
using Ahlcg.ServiceDefaults;
using Scalar.AspNetCore;
using Tablier;
using Tablier.Contract;

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults().AddTablier("ahlcg", "cache");
builder
    .Services.AddSingleton<IGameConfigurator<FixtureConfiguration, FixtureState>, FixtureConfigurator>()
    .AddSingleton<IGameStateProcessor<FixtureState>, FixtureStateProcessor>()
    .AddSingleton<IGameViewProjector<FixtureState, FixtureView>, FixtureViewProjector>()
    .AddGameEngine<FixtureConfiguration, FixtureState, FixtureView>();

var app = builder.Build();
app.UseExceptionHandler();

app.MapDefaultEndpoints();
app.MapTablier();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseDeveloperExceptionPage();
}

await app.RunAsync();
