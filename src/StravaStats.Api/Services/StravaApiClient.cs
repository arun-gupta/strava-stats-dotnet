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

    // Task 2.3: pagination helper — fetch all pages until an empty page or cutoff
    Task<(ActivitySummaryDto[] Activities, HttpResponseMessage? LastResponse)> GetAllActivitiesAsync(
        string accessToken,
        int perPage = 100,
        long? before = null,
        long? after = null,
        int maxPages = 100,
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

    public async Task<(ActivitySummaryDto[] Activities, HttpResponseMessage? LastResponse)> GetAllActivitiesAsync(
        string accessToken,
        int perPage = 100,
        long? before = null,
        long? after = null,
        int maxPages = 100,
        CancellationToken ct = default)
    {
        var all = new List<ActivitySummaryDto>(capacity: perPage * Math.Min(maxPages, 10));
        HttpResponseMessage? last = null;

        for (var page = 1; page <= maxPages; page++)
        {
            ct.ThrowIfCancellationRequested();
            var (items, resp) = await GetActivitiesAsync(accessToken, page, perPage, before, after, ct);
            last = resp;
            if (items.Length == 0)
            {
                break;
            }

            all.AddRange(items);

            // Strava returns at most `per_page` items; if fewer were returned, we reached the last page.
            if (items.Length < perPage)
            {
                break;
            }
        }

        return (all.ToArray(), last);
    }
}
