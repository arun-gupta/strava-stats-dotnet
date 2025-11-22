using System.Text.Json.Serialization;

namespace StravaStats.Api.Models;

public sealed class NormalizedActivity
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("name")] public string? Name { get; set; }

    // Prefer the newer sport type when available
    [JsonPropertyName("sport_type")] public string? SportType { get; set; }

    // Precision: distances as double meters; times as integer seconds
    [JsonPropertyName("distance_m")] public double DistanceMeters { get; set; }
    [JsonPropertyName("moving_time_s")] public int MovingTimeSeconds { get; set; }
    [JsonPropertyName("elapsed_time_s")] public int ElapsedTimeSeconds { get; set; }
    [JsonPropertyName("elevation_gain_m")] public double TotalElevationGainMeters { get; set; }

    // Local time converted from UTC using the activity timezone when possible
    [JsonPropertyName("start_local")] public DateTime StartLocal { get; set; }
    [JsonPropertyName("timezone_id")] public string? TimeZoneId { get; set; }
}
