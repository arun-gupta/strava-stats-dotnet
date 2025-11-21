using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using StravaStats.Api.Options;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using System;
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

// Task 1.3: OAuth login redirect to Strava authorize endpoint
// GET /auth/login?redirectUri={optionalAbsoluteUri}
// If redirectUri is not provided, default to {requestScheme}://{host}/auth/callback
app.MapGet("/auth/login", (IOptions<StravaOptions> strava, HttpContext http, string? redirectUri) =>
{
    var clientId = strava.Value.ClientId;
    if (string.IsNullOrWhiteSpace(clientId))
    {
        return Results.Problem("Strava ClientId is not configured.", statusCode: 500);
    }

    var callback = !string.IsNullOrWhiteSpace(redirectUri)
        ? redirectUri!
        : $"{http.Request.Scheme}://{http.Request.Host}/auth/callback";

    const string scope = "read,activity:read_all";

    var url = $"https://www.strava.com/oauth/authorize" +
              $"?client_id={Uri.EscapeDataString(clientId)}" +
              $"&response_type=code" +
              $"&redirect_uri={Uri.EscapeDataString(callback)}" +
              $"&scope={Uri.EscapeDataString(scope)}";

    return Results.Redirect(url);
});

app.Run();
