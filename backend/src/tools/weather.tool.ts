import { tool } from 'ai';
import { z } from 'zod';

// @ts-ignore
export const weatherTool = tool({
  description: 'Get current weather information for a specific location',
  parameters: z.object({
    location: z.string().describe('City name (e.g., "New York", "São Paulo", "London")'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  // @ts-ignore
  execute: async (args) => {
    const location = args.location || args.city;
    const units = args.units || 'celsius';
    
    console.log('Weather tool called:', { receivedArgs: args, location, units });

    try {
      // Geocode location
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      
      const geoData: any = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        return { error: `Location "${location}" not found` };
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get weather
      const tempUnit = units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&temperature_unit=${tempUnit}`
      );

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
        error: `Failed to get weather: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

