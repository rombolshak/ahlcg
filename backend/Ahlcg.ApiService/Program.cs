using Ahlcg.Rules.Fixture;
using Ahlcg.ServiceDefaults;
using Scalar.AspNetCore;
using Tablier;
using Tablier.Contract;

var builder = WebApplication.CreateBuilder(args);
builder
    .AddServiceDefaults()
    .AddTablier("ahlcg");
builder.Services.AddSingleton<IGameStateProcessor<FixtureConfiguration, FixtureState, FixtureView>, FixtureStateProcessor>();

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

app.Run();
