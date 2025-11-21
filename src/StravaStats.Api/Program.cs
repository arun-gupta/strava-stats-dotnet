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
using System.Text.Json;
using System.Text.Json.Serialization;

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

// Session & caching (Task 1.5 foundation): server-side session with ID cookie
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = ".strava.stats.session";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax; // OK for OAuth redirect back
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // works for http in dev, https in prod
    options.IdleTimeout = TimeSpan.FromHours(8);
});

// Typed HttpClient for Strava API
builder.Services.AddHttpClient("strava");

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSession();

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

    // Parse token response (access_token, refresh_token, expires_at)
    var json = JsonSerializer.Deserialize<TokenResponse>(body, new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    });
    if (json is null || string.IsNullOrWhiteSpace(json.AccessToken))
    {
        return Results.Problem(title: "Unexpected token response from Strava.", detail: body, statusCode: 502);
    }

    // Optionally fetch athlete profile for welcome page
    var athleteName = "";
    try
    {
        // Prefer the embedded athlete info from token response, fall back to API call if missing
        if (json.Athlete is not null)
        {
            athleteName = new[] { json.Athlete.Firstname, json.Athlete.Lastname }
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .DefaultIfEmpty(json.Athlete.Username ?? "")
                .Aggregate("", (acc, s) => string.IsNullOrWhiteSpace(acc) ? s! : acc + " " + s);
        }
        else
        {
            using var authed = new HttpClient();
            authed.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", json.AccessToken);
            var athleteResp = await authed.GetAsync("https://www.strava.com/api/v3/athlete");
            if (athleteResp.IsSuccessStatusCode)
            {
                var athleteRaw = await athleteResp.Content.ReadAsStringAsync();
                var athlete = JsonSerializer.Deserialize<AthleteResponse>(athleteRaw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                athleteName = new[] { athlete?.Firstname, athlete?.Lastname }
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .DefaultIfEmpty(athlete?.Username ?? "")
                    .Aggregate("", (acc, s) => string.IsNullOrWhiteSpace(acc) ? s! : acc + " " + s);
            }
        }
    }
    catch
    {
        // ignore; welcome page will still work without name
    }

    // Store session data server-side (do NOT expose tokens to client)
    http.Session.SetString("strava_access_token", json.AccessToken);
    if (!string.IsNullOrWhiteSpace(json.RefreshToken))
        http.Session.SetString("strava_refresh_token", json.RefreshToken);
    http.Session.SetString("strava_athlete_name", athleteName ?? string.Empty);
    if (json.ExpiresAt.HasValue)
        http.Session.SetString("strava_expires_at", json.ExpiresAt.Value.ToString());

    // Redirect to a simple welcome page
    return Results.Redirect("/welcome");
});

// Simple welcome page that shows signed-in state (no token exposure)
app.MapGet("/welcome", (HttpContext http) =>
{
    var name = http.Session.GetString("strava_athlete_name");
    var isSignedIn = !string.IsNullOrWhiteSpace(http.Session.GetString("strava_access_token"));
    var nameHtml = string.IsNullOrWhiteSpace(name) ? "" : ", " + System.Net.WebUtility.HtmlEncode(name);
    var statusText = isSignedIn ? "You are signed in with Strava." : "You are not signed in.";
    var content =
        "<!DOCTYPE html>\n" +
        "<html lang=\"en\">\n" +
        "  <head>\n" +
        "    <meta charset=\"utf-8\" />\n" +
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" +
        "    <title>Strava Stats — Welcome</title>\n" +
        "    <style>\n" +
        "      body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 2rem; }\n" +
        "      .card { max-width: 640px; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }\n" +
        "      .muted { color: #6b7280; }\n" +
        "      a.button { display: inline-block; padding: 0.6rem 1rem; background: #f96332; color: white; border-radius: 8px; text-decoration: none; }\n" +
        "    </style>\n" +
        "  </head>\n" +
        "  <body>\n" +
        "    <div class=\"card\">\n" +
        "      <h1>Welcome" + nameHtml + "!</h1>\n" +
        "      <p class=\"muted\">" + System.Net.WebUtility.HtmlEncode(statusText) + "</p>\n" +
        "      <p><a class=\"button\" href=\"/auth/login\">Sign in again</a></p>\n" +
        "    </div>\n" +
        "  </body>\n" +
        "</html>\n";
    return Results.Content(content, "text/html");
});

// Task 1.6: Token refresh helper endpoint and service logic
// Internal helper to ensure a valid access token is present in session; refresh if expired/near-expiry
static async Task<(bool ok, string? accessToken, string? error)> EnsureAccessTokenAsync(HttpContext http, IHttpClientFactory httpClientFactory, IOptions<StravaOptions> strava)
{
    var access = http.Session.GetString("strava_access_token");
    var refresh = http.Session.GetString("strava_refresh_token");
    var expiresAtStr = http.Session.GetString("strava_expires_at");
    long expiresAt = 0;
    _ = long.TryParse(expiresAtStr, out expiresAt);

    // Consider token stale if it expires in < 2 minutes
    var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    var stale = expiresAt == 0 || (expiresAt - now) <= 120;

    if (!stale && !string.IsNullOrWhiteSpace(access))
    {
        return (true, access, null);
    }

    if (string.IsNullOrWhiteSpace(refresh))
    {
        return (false, null, "missing_refresh_token");
    }

    var clientId = strava.Value.ClientId;
    var clientSecret = strava.Value.ClientSecret;
    if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
    {
        return (false, null, "server_config_missing");
    }

    var httpClient = httpClientFactory.CreateClient("strava");
    var payload = new Dictionary<string, string>
    {
        ["client_id"] = clientId!,
        ["client_secret"] = clientSecret!,
        ["grant_type"] = "refresh_token",
        ["refresh_token"] = refresh!
    };
    HttpResponseMessage resp;
    try
    {
        resp = await httpClient.PostAsync("https://www.strava.com/oauth/token", new FormUrlEncodedContent(payload));
    }
    catch (Exception ex)
    {
        return (false, null, $"refresh_failed:{ex.Message}");
    }
    var body = await resp.Content.ReadAsStringAsync();
    if (!resp.IsSuccessStatusCode)
    {
        return (false, null, $"refresh_http_{(int)resp.StatusCode}:{body}");
    }

    var refreshed = JsonSerializer.Deserialize<TokenResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    if (refreshed is null || string.IsNullOrWhiteSpace(refreshed.AccessToken))
    {
        return (false, null, "refresh_parse_error");
    }

    http.Session.SetString("strava_access_token", refreshed.AccessToken);
    if (!string.IsNullOrWhiteSpace(refreshed.RefreshToken))
        http.Session.SetString("strava_refresh_token", refreshed.RefreshToken);
    if (refreshed.ExpiresAt.HasValue)
        http.Session.SetString("strava_expires_at", refreshed.ExpiresAt.Value.ToString());

    return (true, refreshed.AccessToken, null);
}

// Example secured proxy endpoint that uses EnsureAccessTokenAsync and calls Strava athlete profile
app.MapGet("/me", async (HttpContext http, IHttpClientFactory httpClientFactory, IOptions<StravaOptions> strava) =>
{
    var ok = await EnsureAccessTokenAsync(http, httpClientFactory, strava);
    if (!ok.ok)
    {
        return Results.Unauthorized();
    }
    var client = httpClientFactory.CreateClient("strava");
    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ok.accessToken);
    var resp = await client.GetAsync("https://www.strava.com/api/v3/athlete");
    var body = await resp.Content.ReadAsStringAsync();
    if (!resp.IsSuccessStatusCode)
    {
        return Results.Problem(title: "Strava API call failed", detail: body, statusCode: (int)resp.StatusCode);
    }
    return Results.Content(body, "application/json");
});

// (types moved above to satisfy top-level statements rule)

app.Run();

// DTOs (minimal) — with top-level statements, types must come after all statements
internal sealed class TokenResponse
{
    [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
    [JsonPropertyName("refresh_token")] public string? RefreshToken { get; set; }
    [JsonPropertyName("expires_at")] public long? ExpiresAt { get; set; }
    [JsonPropertyName("athlete")] public AthleteResponse? Athlete { get; set; }
}

internal sealed class AthleteResponse
{
    [JsonPropertyName("username")] public string? Username { get; set; }
    [JsonPropertyName("firstname")] public string? Firstname { get; set; }
    [JsonPropertyName("lastname")] public string? Lastname { get; set; }
}
