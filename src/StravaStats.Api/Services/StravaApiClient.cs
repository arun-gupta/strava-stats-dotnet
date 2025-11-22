using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using StravaStats.Api.Models;

namespace StravaStats.Api.Services;

public interface IStravaApiClient
{
    Task<(ActivitySummaryDto[] Activities, HttpResponseMessage RawResponse)> GetActivitiesAsync(
        string accessToken,
        int page = 1,
        int perPage = 30,
        long? before = null,
        long? after = null,
        CancellationToken ct = default);
}

public sealed class StravaApiClient : IStravaApiClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public StravaApiClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<(ActivitySummaryDto[] Activities, HttpResponseMessage RawResponse)> GetActivitiesAsync(
        string accessToken,
        int page = 1,
        int perPage = 30,
        long? before = null,
        long? after = null,
        CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("strava");

        // Build query string
        var sb = new StringBuilder($"athlete/activities?page={page}&per_page={perPage}");
        if (before.HasValue) sb.Append("&before=").Append(before.Value);
        if (after.HasValue) sb.Append("&after=").Append(after.Value);

        using var req = new HttpRequestMessage(HttpMethod.Get, sb.ToString());
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var resp = await client.SendAsync(req, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
        {
            // Throwing preserves status and message for callers to convert to ProblemDetails
            throw new HttpRequestException($"Strava activities fetch failed: {(int)resp.StatusCode} {resp.ReasonPhrase}. Body: {body}", null, resp.StatusCode);
        }

        var activities = JsonSerializer.Deserialize<ActivitySummaryDto[]>(body, JsonOpts) ?? Array.Empty<ActivitySummaryDto>();
        return (activities, resp);
    }
}
