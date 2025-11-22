using StravaStats.Api.Services;
using Xunit;

namespace StravaStats.Api.Tests;

/// <summary>
/// Unit tests for the UnitConverter service.
/// </summary>
public class UnitConverterTests
{
    private readonly IUnitConverter _converter;

    public UnitConverterTests()
    {
        _converter = new UnitConverter();
    }

    [Theory]
    [InlineData(1000, 1.0)]          // 1000m = 1km
    [InlineData(5000, 5.0)]          // 5000m = 5km
    [InlineData(10000, 10.0)]        // 10000m = 10km
    [InlineData(0, 0.0)]             // 0m = 0km
    public void MetersToKilometers_ConvertsCorrectly(double meters, double expectedKm)
    {
        var result = _converter.MetersToKilometers(meters);
        Assert.Equal(expectedKm, result, precision: 2);
    }

    [Theory]
    [InlineData(1609.344, 1.0)]      // 1609.344m = 1mi
    [InlineData(8046.72, 5.0)]       // 8046.72m = 5mi
    [InlineData(16093.44, 10.0)]     // 16093.44m = 10mi
    [InlineData(0, 0.0)]             // 0m = 0mi
    public void MetersToMiles_ConvertsCorrectly(double meters, double expectedMiles)
    {
        var result = _converter.MetersToMiles(meters);
        Assert.Equal(expectedMiles, result, precision: 2);
    }

    [Theory]
    [InlineData(1.0, 1000)]          // 1km = 1000m
    [InlineData(5.0, 5000)]          // 5km = 5000m
    [InlineData(10.0, 10000)]        // 10km = 10000m
    public void KilometersToMeters_ConvertsCorrectly(double km, double expectedMeters)
    {
        var result = _converter.KilometersToMeters(km);
        Assert.Equal(expectedMeters, result, precision: 2);
    }

    [Theory]
    [InlineData(1.0, 1609.344)]      // 1mi = 1609.344m
    [InlineData(5.0, 8046.72)]       // 5mi = 8046.72m
    public void MilesToMeters_ConvertsCorrectly(double miles, double expectedMeters)
    {
        var result = _converter.MilesToMeters(miles);
        Assert.Equal(expectedMeters, result, precision: 2);
    }

    [Theory]
    [InlineData(3.33, 5.0)]          // 3.33 m/s ≈ 5:00 min/km (running pace)
    [InlineData(4.17, 4.0)]          // 4.17 m/s ≈ 4:00 min/km (faster running pace)
    [InlineData(2.78, 6.0)]          // 2.78 m/s ≈ 6:00 min/km (jogging pace)
    public void MetersPerSecondToMinutesPerKilometer_ConvertsCorrectly(double mps, double expectedMinPerKm)
    {
        var result = _converter.MetersPerSecondToMinutesPerKilometer(mps);
        Assert.Equal(expectedMinPerKm, result, precision: 1);
    }

    [Theory]
    [InlineData(3.33, 8.0548)]       // 3.33 m/s ≈ 8:03 min/mi
    [InlineData(4.17, 6.4322)]       // 4.17 m/s ≈ 6:26 min/mi
    public void MetersPerSecondToMinutesPerMile_ConvertsCorrectly(double mps, double expectedMinPerMile)
    {
        var result = _converter.MetersPerSecondToMinutesPerMile(mps);
        Assert.Equal(expectedMinPerMile, result, precision: 3);
    }

    [Fact]
    public void MetersPerSecondToMinutesPerKilometer_ZeroSpeed_ReturnsZero()
    {
        var result = _converter.MetersPerSecondToMinutesPerKilometer(0);
        Assert.Equal(0, result);
    }

    [Fact]
    public void MetersPerSecondToMinutesPerMile_NegativeSpeed_ReturnsZero()
    {
        var result = _converter.MetersPerSecondToMinutesPerMile(-1);
        Assert.Equal(0, result);
    }

    [Theory]
    [InlineData(3.33, 11.99)]        // 3.33 m/s ≈ 11.99 km/h
    [InlineData(5.0, 18.0)]          // 5.0 m/s = 18 km/h
    public void MetersPerSecondToKilometersPerHour_ConvertsCorrectly(double mps, double expectedKph)
    {
        var result = _converter.MetersPerSecondToKilometersPerHour(mps);
        Assert.Equal(expectedKph, result, precision: 1);
    }

    [Theory]
    [InlineData(3.33, 7.45)]         // 3.33 m/s ≈ 7.45 mph
    [InlineData(5.0, 11.18)]         // 5.0 m/s ≈ 11.18 mph
    public void MetersPerSecondToMilesPerHour_ConvertsCorrectly(double mps, double expectedMph)
    {
        var result = _converter.MetersPerSecondToMilesPerHour(mps);
        Assert.Equal(expectedMph, result, precision: 1);
    }

    [Theory]
    [InlineData(100, 328.08)]        // 100m ≈ 328.08 ft
    [InlineData(1000, 3280.84)]      // 1000m ≈ 3280.84 ft
    public void MetersToFeet_ConvertsCorrectly(double meters, double expectedFeet)
    {
        var result = _converter.MetersToFeet(meters);
        Assert.Equal(expectedFeet, result, precision: 2);
    }

    [Theory]
    [InlineData(328.08, 100)]        // 328.08 ft ≈ 100m
    [InlineData(3280.84, 1000)]      // 3280.84 ft ≈ 1000m
    public void FeetToMeters_ConvertsCorrectly(double feet, double expectedMeters)
    {
        var result = _converter.FeetToMeters(feet);
        Assert.Equal(expectedMeters, result, precision: 0);
    }

    [Theory]
    [InlineData(5000, UnitSystem.Metric, "5 km")]
    [InlineData(5000, UnitSystem.Imperial, "3.11 mi")]
    [InlineData(10000, UnitSystem.Metric, "10 km")]
    public void FormatDistance_FormatsCorrectly(double meters, UnitSystem system, string expected)
    {
        var result = _converter.FormatDistance(meters, system);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(3.33, UnitSystem.Metric, "5:00 min/km")]      // 3.33 m/s = 5:00 min/km
    [InlineData(3.33, UnitSystem.Imperial, "8:03 min/mi")]    // 3.33 m/s = 8:03 min/mi
    [InlineData(4.17, UnitSystem.Metric, "3:59 min/km")]      // 4.17 m/s ≈ 3:59 min/km (actual calculation)
    public void FormatPace_FormatsCorrectly(double mps, UnitSystem system, string expected)
    {
        var result = _converter.FormatPace(mps, system);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FormatPace_ZeroSpeed_ReturnsPlaceholder()
    {
        var result = _converter.FormatPace(0, UnitSystem.Metric);
        Assert.Equal("—", result);
    }

    [Theory]
    [InlineData(5.0, UnitSystem.Metric, "18 km/h")]
    [InlineData(5.0, UnitSystem.Imperial, "11.2 mph")]
    public void FormatSpeed_FormatsCorrectly(double mps, UnitSystem system, string expected)
    {
        var result = _converter.FormatSpeed(mps, system);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(100, UnitSystem.Metric, "100 m")]
    [InlineData(100, UnitSystem.Imperial, "328 ft")]
    [InlineData(1000, UnitSystem.Metric, "1000 m")]
    public void FormatElevation_FormatsCorrectly(double meters, UnitSystem system, string expected)
    {
        var result = _converter.FormatElevation(meters, system);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void FormatDistance_WithCustomDecimals_FormatsCorrectly()
    {
        var result = _converter.FormatDistance(5432.1, UnitSystem.Metric, 3);
        Assert.Equal("5.432 km", result);
    }

    [Fact]
    public void FormatSpeed_WithCustomDecimals_FormatsCorrectly()
    {
        var result = _converter.FormatSpeed(5.123, UnitSystem.Metric, 2);
        Assert.Equal("18.44 km/h", result);
    }
}
