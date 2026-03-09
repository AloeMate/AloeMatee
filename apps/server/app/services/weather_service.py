import logging
import httpx

logger = logging.getLogger(__name__)

# District → (lat, lon) — all 8 regions exposed in the mobile UI
DISTRICT_COORDS: dict[str, tuple[float, float]] = {
    "Kurunegala":   (7.4863,  80.3647),
    "Anuradhapura": (8.3114,  80.4037),
    "Colombo":      (6.9271,  79.8612),
    "Kandy":        (7.2906,  80.6337),
    "Galle":        (6.0535,  80.2210),
    "Matara":       (5.9549,  80.5550),
    "Jaffna":       (9.6615,  80.0255),
    "Puttalam":     (8.0362,  79.8283),
}

_MOCK_WEATHER = {"temperatureC": 28.5, "humidityPct": 75.0, "rainfallMm": 2.0}


async def get_weather_for_district(
    region: str,
    api_key: str,
    base_url: str = "https://api.openweathermap.org",
) -> dict:
    """Return live weather for the given region, falling back to mock data on failure."""
    coords = DISTRICT_COORDS.get(region)
    if coords is None:
        raise ValueError(
            f"Unsupported region '{region}'. "
            f"Valid options: {list(DISTRICT_COORDS.keys())}"
        )

    lat, lon = coords
    url = f"{base_url}/data/2.5/weather"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
            )
            response.raise_for_status()
            data = response.json()

        temp_c      = data["main"]["temp"]
        humidity    = data["main"]["humidity"]
        rain_mm     = data.get("rain", {}).get("1h", 0.0)

        return {"temperatureC": temp_c, "humidityPct": humidity, "rainfallMm": rain_mm}

    except Exception as exc:
        logger.warning("OpenWeather API failed (%s) — using mock weather data.", exc)
        return dict(_MOCK_WEATHER)
