using System.Globalization;
using StravaStats.Api.Models;

namespace StravaStats.Api.Services;

public interface IActivityNormalizer
{
    NormalizedActivity Normalize(ActivitySummaryDto dto);
    NormalizedActivity[] NormalizeMany(IEnumerable<ActivitySummaryDto> items);
}

public sealed class ActivityNormalizer : IActivityNormalizer
{
    public NormalizedActivity Normalize(ActivitySummaryDto dto)
    {
        var tzId = TryExtractIanaTz(dto.Timezone);

        DateTime startLocal;
        if (!string.IsNullOrWhiteSpace(tzId) && TryGetTimeZone(tzId!, out var tz))
        {
            startLocal = TimeZoneInfo.ConvertTime(dto.StartDateUtc, tz).DateTime;
        }
        else
        {
            // Fallback: use Strava-provided local timestamp (drop offset to local clock time)
            startLocal = dto.StartDateLocal.LocalDateTime;
        }

        return new NormalizedActivity
        {
            Id = dto.Id,
            Name = dto.Name,
            SportType = string.IsNullOrWhiteSpace(dto.SportType) ? dto.Type : dto.SportType,
            DistanceMeters = Math.Round(dto.Distance, 2),
            MovingTimeSeconds = dto.MovingTime,
            ElapsedTimeSeconds = dto.ElapsedTime,
            TotalElevationGainMeters = Math.Round(dto.TotalElevationGain, 2),
            StartLocal = startLocal,
            TimeZoneId = tzId
        };
    }

    public NormalizedActivity[] NormalizeMany(IEnumerable<ActivitySummaryDto> items)
        => items.Select(Normalize).ToArray();

    private static bool TryGetTimeZone(string tzId, out TimeZoneInfo tz)
    {
        try
        {
            tz = TimeZoneInfo.FindSystemTimeZoneById(tzId);
            return true;
        }
        catch
        {
            tz = TimeZoneInfo.Local;
            return false;
        }
    }

    // Strava "timezone" example: "(GMT-08:00) America/Los_Angeles" — extract the IANA id after the space
    private static string? TryExtractIanaTz(string? tzField)
    {
        if (string.IsNullOrWhiteSpace(tzField)) return null;
        var trimmed = tzField.Trim();
        var lastSpace = trimmed.LastIndexOf(' ');
        if (lastSpace >= 0 && lastSpace + 1 < trimmed.Length)
        {
            var candidate = trimmed[(lastSpace + 1)..];
            if (candidate.Contains('/')) return candidate;
        }
        // If the whole string looks like an IANA id, return it
        if (trimmed.Contains('/')) return trimmed;
        return null;
    }
}
