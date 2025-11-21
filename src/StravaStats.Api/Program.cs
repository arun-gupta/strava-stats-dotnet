using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using StravaStats.Api.Options;
using System.Collections.Generic;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Map common environment variables to configuration keys so Options binding works consistently.
// Supports either: Strava:ClientId/ClientSecret (User Secrets or env with double underscore)
// or legacy flat env vars: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SESSION_SECRET
var mappedEnv = new Dictionary<string, string?>
{
    ["Strava:ClientId"] = builder.Configuration["STRAVA_CLIENT_ID"],
    ["Strava:ClientSecret"] = builder.Configuration["STRAVA_CLIENT_SECRET"],
    ["Security:SessionSecret"] = builder.Configuration["SESSION_SECRET"],
};
builder.Configuration.AddInMemoryCollection(
    mappedEnv.Where(kv => !string.IsNullOrWhiteSpace(kv.Value))!
);

// Services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Bind options
builder.Services.Configure<StravaOptions>(builder.Configuration.GetSection("Strava"));
builder.Services.Configure<SecurityOptions>(builder.Configuration.GetSection("Security"));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
