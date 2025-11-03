import express, { Request, Response } from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { currencyTool } from './tools/currency.tool';
import { weatherTool } from './tools/weather.tool';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const ollama = createOpenAI({
  name: 'ollama',
  apiKey: 'ollama', 
  baseURL: 'http://localhost:11434/v1',
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    console.log('request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('Starting streamText...');
    
    const result = streamText({
      // model: ollama.chat('mistral:7b'),
      model: ollama.chat('llama3.1:8b'),
      messages,
      tools: {
        getCurrency: currencyTool,
        getWeather: weatherTool,
      },
      // maxToolRoundtrips: 5,
    });

    console.log('Setting up stream...');
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = result.fullStream;
    
    console.log('Starting to stream...');
    let chunkCount = 0;
    let hasText = false;
    let toolResults: any[] = [];
    
    for await (const chunk of stream) {
      chunkCount++;
      console.log(`Chunk ${chunkCount}:`, JSON.stringify(chunk, null, 2));
      
      if (chunk.type === 'text-delta') {
        hasText = true;
        res.write(chunk.text);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk.toolName, chunk.input);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result:', chunk.output);
        toolResults.push(chunk.output);
      }
    }

    if (!hasText && toolResults.length > 0) {
      console.log('No text generated, formatting tool results...');
      const lastResult = toolResults[toolResults.length - 1];
      
      if (lastResult.error) {
        res.write(`Error: ${lastResult.error}`);
      } else if (lastResult.temperature !== undefined) {
        // Weather result
        const tempSymbol = lastResult.units.temperature === 'fahrenheit' ? 'F' : 'C';
        const response = `Weather in ${lastResult.location}:\n` +
          `Temperature: ${lastResult.temperature}°${tempSymbol}\n` +
          `Feels like: ${lastResult.feels_like}°${tempSymbol}\n` +
          `Humidity: ${lastResult.humidity}%\n` +
          `Wind speed: ${lastResult.wind_speed} ${lastResult.units.wind_speed}\n` +
          `Precipitation: ${lastResult.precipitation} ${lastResult.units.precipitation}`;
        res.write(response);
      } else if (lastResult.amount !== undefined) {
        // Currency result
        const response = `${lastResult.amount} ${lastResult.from} is equal to ${lastResult.converted} ${lastResult.to} (exchange rate: ${lastResult.rate} as of ${lastResult.timestamp})`;
        res.write(response);
      }
    }

    res.end();
    console.log('Response ended successfully');
  
  } catch (error) {
    console.error('Chat error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Using Ollama local server`);
});
