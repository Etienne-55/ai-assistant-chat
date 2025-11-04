import { tool } from 'ai';
import { z } from 'zod';

const weatherParamsSchema = z.object({
  location: z.string().min(1, 'Location is required').describe('City name (e.g., "New York", "São Paulo", "London")'),
  units: z.enum(['celsius', 'fahrenheit']).default('celsius').describe('Temperature units (default: celsius)'),
});

type WeatherParams = z.infer<typeof weatherParamsSchema>;

interface WeatherToolResult {
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  temperature: number;
  feels_like: number;
  humidity: number;
  precipitation: number;
  wind_speed: number;
  units: {
    temperature: string;
    wind_speed: string;
    precipitation: string;
  };
  timestamp: string;
  error?: string;
}

export const weatherTool = tool({
  description: 'Get current weather information for a specific location. Use this tool ONLY for queries explicitly mentioning weather, temperature, or a location’s climate (e.g., "What’s the weather in London?", "Is it raining in Paris?"). Do NOT use for greetings (e.g., "Hello"), general knowledge questions (e.g., "What’s the biggest animal?"), or unrelated topics.',
  inputSchema: weatherParamsSchema,
  execute: async (args: WeatherParams): Promise<WeatherToolResult> => {
    const { location, units } = args;

    console.log('Weather tool called:', { location, units });

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );

      if (!geoRes.ok) {
        return { error: `Failed to geocode location "${location}"` } as WeatherToolResult;
      }

      const geoData: any = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        return { error: `Location "${location}" not found` } as WeatherToolResult;
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      const tempUnit = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&temperature_unit=${tempUnit}`
      );

      if (!weatherRes.ok) {
        return { error: `Failed to fetch weather for "${location}"` } as WeatherToolResult;
      }

      const weatherData: any = await weatherRes.json();
      const current = weatherData.current;

      return {
        location: `${name}, ${country}`,
        coordinates: {
          latitude,
          longitude,
        },
        temperature: current.temperature_2m,
        feels_like: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        wind_speed: current.wind_speed_10m,
        units: {
          temperature: tempUnit,
          wind_speed: 'km/h',
          precipitation: 'mm',
        },
        timestamp: current.time,
      };
    } catch (error) {
      return {
        error: `Failed to get weather for "${location}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      } as WeatherToolResult;
    }
  },
} as any); // Type assertion to bypass TS2589
