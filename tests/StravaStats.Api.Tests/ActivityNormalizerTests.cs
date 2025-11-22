using System;
using StravaStats.Api.Models;
using StravaStats.Api.Services;
using Xunit;

namespace StravaStats.Api.Tests;

public class ActivityNormalizerTests
{
    private static ActivitySummaryDto MakeDto(
        DateTimeOffset startUtc,
        DateTimeOffset startLocal,
        string? tz,
        float distance = 1234.5678f,
        float elev = 89.991f,
        int moving = 3601,
        int elapsed = 3700,
        string sport = "Run")
    {
        return new ActivitySummaryDto
        {
            Id = 42,
            Name = "Test",
            SportType = sport,
            Type = sport,
            StartDateUtc = startUtc,
            StartDateLocal = startLocal,
            Timezone = tz,
            Distance = distance,
            TotalElevationGain = elev,
            MovingTime = moving,
            ElapsedTime = elapsed
        };
    }

    [Fact]
    public void Normalizes_With_Iana_Timezone_From_Strava_Format()
    {
        // Example: "(GMT-08:00) America/Los_Angeles" in winter (standard time, UTC-8)
        var utc = new DateTimeOffset(2025, 1, 15, 12, 0, 0, TimeSpan.Zero);
        var localFromStrava = new DateTimeOffset(2025, 1, 15, 4, 0, 0, TimeSpan.FromHours(-8));
        var dto = MakeDto(utc, localFromStrava, "(GMT-08:00) America/Los_Angeles");

        var normalizer = new ActivityNormalizer();
        var result = normalizer.Normalize(dto);

        Assert.Equal("America/Los_Angeles", result.TimeZoneId);
        Assert.Equal(new DateTime(2025, 1, 15, 4, 0, 0), result.StartLocal);
        Assert.Equal(1234.57, result.DistanceMeters, 2);
        Assert.Equal(89.99, result.TotalElevationGainMeters, 2);
        Assert.Equal(3601, result.MovingTimeSeconds);
        Assert.Equal(3700, result.ElapsedTimeSeconds);
    }

    [Fact]
    public void Normalizes_DST_Summer_Offset()
    {
        // Summer in LA is DST (UTC-7)
        var utc = new DateTimeOffset(2025, 7, 1, 12, 0, 0, TimeSpan.Zero);
        var localFromStrava = new DateTimeOffset(2025, 7, 1, 5, 0, 0, TimeSpan.FromHours(-7));
        var dto = MakeDto(utc, localFromStrava, "America/Los_Angeles");

        var normalizer = new ActivityNormalizer();
        var result = normalizer.Normalize(dto);

        Assert.Equal("America/Los_Angeles", result.TimeZoneId);
        Assert.Equal(new DateTime(2025, 7, 1, 5, 0, 0), result.StartLocal);
    }

    [Fact]
    public void Falls_Back_To_StartDateLocal_When_Timezone_Missing()
    {
        var utc = new DateTimeOffset(2025, 1, 15, 12, 34, 0, TimeSpan.Zero);
        var localFromStrava = new DateTimeOffset(2025, 1, 15, 7, 34, 0, TimeSpan.FromHours(-5));
        var dto = MakeDto(utc, localFromStrava, null);

        var normalizer = new ActivityNormalizer();
        var result = normalizer.Normalize(dto);

        // No tz id when missing
        Assert.Null(result.TimeZoneId);
        // StartLocal should equal the Strava-provided local clock time
        Assert.Equal(localFromStrava.LocalDateTime, result.StartLocal);
    }

    [Fact]
    public void Falls_Back_When_Timezone_Malformed()
    {
        var utc = new DateTimeOffset(2025, 3, 10, 10, 0, 0, TimeSpan.Zero);
        var localFromStrava = new DateTimeOffset(2025, 3, 10, 11, 0, 0, TimeSpan.FromHours(+1));
        var dto = MakeDto(utc, localFromStrava, "FooBar");

        var normalizer = new ActivityNormalizer();
        var result = normalizer.Normalize(dto);

        Assert.Null(result.TimeZoneId);
        Assert.Equal(localFromStrava.LocalDateTime, result.StartLocal);
    }
}
