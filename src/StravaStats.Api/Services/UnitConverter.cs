namespace StravaStats.Api.Services;

/// <summary>
/// Interface for converting activity metrics between imperial and metric units.
/// </summary>
public interface IUnitConverter
{
    // Distance conversions
    double MetersToKilometers(double meters);
    double MetersToMiles(double meters);
    double KilometersToMeters(double kilometers);
    double MilesToMeters(double miles);

    // Pace conversions (returns seconds per unit distance)
    double MetersPerSecondToMinutesPerKilometer(double metersPerSecond);
    double MetersPerSecondToMinutesPerMile(double metersPerSecond);

    // Speed conversions
    double MetersPerSecondToKilometersPerHour(double metersPerSecond);
    double MetersPerSecondToMilesPerHour(double metersPerSecond);

    // Elevation conversions
    double MetersToFeet(double meters);
    double FeetToMeters(double feet);

    // Format helpers for display
    string FormatDistance(double meters, UnitSystem system, int decimals = 2);
    string FormatPace(double metersPerSecond, UnitSystem system);
    string FormatSpeed(double metersPerSecond, UnitSystem system, int decimals = 1);
    string FormatElevation(double meters, UnitSystem system, int decimals = 0);
}

/// <summary>
/// Unit system enumeration.
/// </summary>
public enum UnitSystem
{
    Metric,
    Imperial
}

/// <summary>
/// Implements unit conversions for activity metrics.
/// </summary>
public class UnitConverter : IUnitConverter
{
    // Conversion constants
    private const double MetersPerKilometer = 1000.0;
    private const double MetersPerMile = 1609.344;
    private const double MetersPerFoot = 0.3048;
    private const double SecondsPerMinute = 60.0;
    private const double SecondsPerHour = 3600.0;

    // Distance conversions
    public double MetersToKilometers(double meters) => meters / MetersPerKilometer;

    public double MetersToMiles(double meters) => meters / MetersPerMile;

    public double KilometersToMeters(double kilometers) => kilometers * MetersPerKilometer;

    public double MilesToMeters(double miles) => miles * MetersPerMile;

    // Pace conversions (converts m/s to min/km or min/mi)
    // Pace = time per distance unit (e.g., 5:30 min/km means 5.5 minutes to run 1 km)
    public double MetersPerSecondToMinutesPerKilometer(double metersPerSecond)
    {
        if (metersPerSecond <= 0) return 0;

        // Speed in km/h = (m/s) * (3600 s/h) / (1000 m/km)
        var kilometersPerHour = metersPerSecond * SecondsPerHour / MetersPerKilometer;

        // Pace in min/km = 60 min/h / (km/h)
        return SecondsPerMinute / kilometersPerHour;
    }

    public double MetersPerSecondToMinutesPerMile(double metersPerSecond)
    {
        if (metersPerSecond <= 0) return 0;

        // Speed in mi/h = (m/s) * (3600 s/h) / (1609.344 m/mi)
        var milesPerHour = metersPerSecond * SecondsPerHour / MetersPerMile;

        // Pace in min/mi = 60 min/h / (mi/h)
        return SecondsPerMinute / milesPerHour;
    }

    // Speed conversions
    public double MetersPerSecondToKilometersPerHour(double metersPerSecond)
        => metersPerSecond * SecondsPerHour / MetersPerKilometer;

    public double MetersPerSecondToMilesPerHour(double metersPerSecond)
        => metersPerSecond * SecondsPerHour / MetersPerMile;

    // Elevation conversions
    public double MetersToFeet(double meters) => meters / MetersPerFoot;

    public double FeetToMeters(double feet) => feet * MetersPerFoot;

    // Format helpers for display
    public string FormatDistance(double meters, UnitSystem system, int decimals = 2)
    {
        return system switch
        {
            UnitSystem.Metric => $"{Math.Round(MetersToKilometers(meters), decimals)} km",
            UnitSystem.Imperial => $"{Math.Round(MetersToMiles(meters), decimals)} mi",
            _ => $"{Math.Round(meters, decimals)} m"
        };
    }

    public string FormatPace(double metersPerSecond, UnitSystem system)
    {
        if (metersPerSecond <= 0) return "—";

        var paceMinutes = system switch
        {
            UnitSystem.Metric => MetersPerSecondToMinutesPerKilometer(metersPerSecond),
            UnitSystem.Imperial => MetersPerSecondToMinutesPerMile(metersPerSecond),
            _ => 0
        };

        var minutes = (int)Math.Floor(paceMinutes);
        var seconds = (int)Math.Floor((paceMinutes - minutes) * SecondsPerMinute);
        var unit = system == UnitSystem.Metric ? "min/km" : "min/mi";

        return $"{minutes}:{seconds:D2} {unit}";
    }

    public string FormatSpeed(double metersPerSecond, UnitSystem system, int decimals = 1)
    {
        return system switch
        {
            UnitSystem.Metric => $"{Math.Round(MetersPerSecondToKilometersPerHour(metersPerSecond), decimals)} km/h",
            UnitSystem.Imperial => $"{Math.Round(MetersPerSecondToMilesPerHour(metersPerSecond), decimals)} mph",
            _ => $"{Math.Round(metersPerSecond, decimals)} m/s"
        };
    }

    public string FormatElevation(double meters, UnitSystem system, int decimals = 0)
    {
        return system switch
        {
            UnitSystem.Metric => $"{Math.Round(meters, decimals)} m",
            UnitSystem.Imperial => $"{Math.Round(MetersToFeet(meters), decimals)} ft",
            _ => $"{Math.Round(meters, decimals)} m"
        };
    }
}
