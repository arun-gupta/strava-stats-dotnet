using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using StravaStats.Api.Options;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

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

// Task 1.4: OAuth callback to exchange authorization code for tokens
// GET /auth/callback?code=...&state=...
// Minimal implementation: exchanges code for token and returns raw JSON (temporary for verification)
app.MapGet("/auth/callback", async (
    IOptions<StravaOptions> strava,
    HttpContext http,
    string? code,
    string? state) =>
{
    if (string.IsNullOrWhiteSpace(code))
    {
        return Results.BadRequest(new { error = "missing_code", message = "Missing 'code' query parameter." });
    }

    var clientId = strava.Value.ClientId;
    var clientSecret = strava.Value.ClientSecret;
    if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
    {
        return Results.Problem("Strava ClientId/ClientSecret are not configured.", statusCode: 500);
    }

    // Compute redirect_uri identical to what was used in /auth/login by default
    var redirectUri = $"{http.Request.Scheme}://{http.Request.Host}/auth/callback";

    using var httpClient = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.Post, "https://www.strava.com/oauth/token")
    {
        Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = clientId!,
            ["client_secret"] = clientSecret!,
            ["code"] = code!,
            ["grant_type"] = "authorization_code",
            // Strava does not require redirect_uri for code exchange, but some providers do; keeping local for completeness
            // ["redirect_uri"] = redirectUri,
        })
    };

    HttpResponseMessage resp;
    try
    {
        resp = await httpClient.SendAsync(request);
    }
    catch (Exception ex)
    {
        return Results.Problem($"Failed to contact Strava token endpoint: {ex.Message}", statusCode: 502);
    }

    var body = await resp.Content.ReadAsStringAsync();
    if (!resp.IsSuccessStatusCode)
    {
        return Results.Problem(
            title: "Strava token exchange failed",
            detail: body,
            statusCode: (int)resp.StatusCode);
    }

    // For Task 1.4 we return the raw JSON payload. In Task 1.5 we'll store tokens securely and avoid sending them to the client.
    return Results.Content(body, "application/json");
});

app.Run();
