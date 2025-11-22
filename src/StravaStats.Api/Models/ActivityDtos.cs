using System.Text.Json.Serialization;

namespace StravaStats.Api.Models;

// Summary model for Strava activities as returned by GET /athlete/activities
// This intentionally models the common fields we need for analysis/dashboards.
public sealed class ActivitySummaryDto
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }

    // Both legacy "type" and newer "sport_type" exist; keep both for compatibility
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("sport_type")] public string? SportType { get; set; }

    // Distances in meters; times in seconds (as per Strava API)
    [JsonPropertyName("distance")] public float Distance { get; set; }
    [JsonPropertyName("moving_time")] public int MovingTime { get; set; }
    [JsonPropertyName("elapsed_time")] public int ElapsedTime { get; set; }
    [JsonPropertyName("total_elevation_gain")] public float TotalElevationGain { get; set; }

    // Timestamps
    [JsonPropertyName("start_date")] public DateTimeOffset StartDateUtc { get; set; }
    [JsonPropertyName("start_date_local")] public DateTimeOffset StartDateLocal { get; set; }
    [JsonPropertyName("timezone")] public string? Timezone { get; set; }

    // Location (optional; may be null)
    [JsonPropertyName("start_latlng")] public float[]? StartLatLng { get; set; }
    [JsonPropertyName("end_latlng")] public float[]? EndLatLng { get; set; }

    // Achievement & effort basics
    [JsonPropertyName("achievement_count")] public int AchievementCount { get; set; }
    [JsonPropertyName("kudos_count")] public int KudosCount { get; set; }

    // Helpful flags
    [JsonPropertyName("trainer")] public bool Trainer { get; set; }
    [JsonPropertyName("commute")] public bool Commute { get; set; }
    [JsonPropertyName("manual")] public bool Manual { get; set; }
}
