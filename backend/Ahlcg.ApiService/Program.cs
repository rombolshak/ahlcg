using Ahlcg.ServiceDefaults;
using Scalar.AspNetCore;
using Tablier;

var builder = WebApplication.CreateBuilder(args);
builder
    .AddServiceDefaults()
    .AddTablier("ahlcg");

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
