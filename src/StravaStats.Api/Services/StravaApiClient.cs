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

    private readonly struct RateLimitInfo
    {
        public readonly int MinuteLimit { get; init; }
        public readonly int DayLimit { get; init; }
        public readonly int MinuteUsed { get; init; }
        public readonly int DayUsed { get; init; }

        public bool IsNearMinuteLimit80 => MinuteLimit > 0 && MinuteUsed >= (int)Math.Floor(MinuteLimit * 0.8);
        public bool IsNearMinuteLimit90 => MinuteLimit > 0 && MinuteUsed >= (int)Math.Floor(MinuteLimit * 0.9);
    }

    private static RateLimitInfo ParseRateLimitHeaders(HttpResponseMessage resp)
    {
        static (int, int) ParsePair(string? csv)
        {
            if (string.IsNullOrWhiteSpace(csv)) return (0, 0);
            var parts = csv.Split(',', 2, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            int a = 0, b = 0;
            _ = parts.Length > 0 && int.TryParse(parts[0], out a);
            _ = parts.Length > 1 && int.TryParse(parts[1], out b);
            return (a, b);
        }

        resp.Headers.TryGetValues("X-RateLimit-Limit", out var limitVals);
        resp.Headers.TryGetValues("X-RateLimit-Usage", out var usageVals);
        var limit = ParsePair(limitVals?.FirstOrDefault());
        var usage = ParsePair(usageVals?.FirstOrDefault());
        return new RateLimitInfo
        {
            MinuteLimit = limit.Item1,
            DayLimit = limit.Item2,
            MinuteUsed = usage.Item1,
            DayUsed = usage.Item2
        };
    }

    private static TimeSpan ComputeQuarterHourResetDelay(DateTimeOffset nowUtc)
    {
        var minutesIntoQuarter = nowUtc.Minute % 15;
        var secondsIntoQuarter = minutesIntoQuarter * 60 + nowUtc.Second;
        var remaining = TimeSpan.FromMinutes(15) - TimeSpan.FromSeconds(secondsIntoQuarter);
        if (remaining < TimeSpan.Zero) remaining = TimeSpan.Zero;
        return remaining;
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

        // Basic retry-on-429 with wait until next quarter-hour window
        for (var attempt = 0; attempt < 2; attempt++)
        {
            ct.ThrowIfCancellationRequested();

            using var req = new HttpRequestMessage(HttpMethod.Get, sb.ToString());
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var resp = await client.SendAsync(req, ct);
            if ((int)resp.StatusCode == 429)
            {
                if (attempt == 0)
                {
                    // compute wait until next quarter-hour
                    var wait = ComputeQuarterHourResetDelay(DateTimeOffset.UtcNow);
                    if (wait > TimeSpan.Zero)
                    {
                        await Task.Delay(wait, ct);
                        continue; // retry once after wait
                    }
                }
            }

            var body = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                // Throwing preserves status and message for callers to convert to ProblemDetails
                throw new HttpRequestException($"Strava activities fetch failed: {(int)resp.StatusCode} {resp.ReasonPhrase}. Body: {body}", null, resp.StatusCode);
            }

            var activities = JsonSerializer.Deserialize<ActivitySummaryDto[]>(body, JsonOpts) ?? Array.Empty<ActivitySummaryDto>();
            return (activities, resp);
        }

        // Should not reach; safeguard
        throw new HttpRequestException("Strava activities fetch failed after retry due to rate limiting.", null, System.Net.HttpStatusCode.TooManyRequests);
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

            // Gentle backoff between page calls if we're approaching minute limits
            var rl = ParseRateLimitHeaders(resp);
            if (rl.IsNearMinuteLimit90)
            {
                await Task.Delay(TimeSpan.FromSeconds(60), ct);
            }
            else if (rl.IsNearMinuteLimit80)
            {
                await Task.Delay(TimeSpan.FromSeconds(15), ct);
            }
        }

        return (all.ToArray(), last);
    }
}
