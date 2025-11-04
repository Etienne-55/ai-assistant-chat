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

const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const ollama = createOpenAI({
  name: 'ollama',
  apiKey: 'ollama',
  baseURL: `${ollamaURL}/v1`,
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    if (messages.length === 0) {
      return res.status(400).json({ error: 'At least one message is required' });
    }

    console.log('Starting streamText...');

    const systemPrompt = `You are a helpful assistant that prioritizes direct, concise, and accurate text responses for all queries unless explicitly required to use a tool. ONLY use the 'getCurrency' tool for queries explicitly mentioning currency conversion (e.g., "Convert 100 USD to EUR") and the 'getWeather' tool for queries explicitly mentioning weather or a location’s climate (e.g., "What's the weather in London?"). For greetings (e.g., "Hello", "Hi") or general knowledge questions (e.g., "What's the biggest animal?", "What’s the fastest car?"), ALWAYS provide a direct text response and DO NOT invoke any tools, even if the query mentions avoiding tools. Never invent or assume the existence of tools not provided (e.g., do not create a "getAnimal" tool). Avoid technical terms like "JSON", "function call", or "tool" in your answers.`;

    const result = await streamText({
      model: ollama.chat('llama3.1:8b'),
      system: systemPrompt,
      messages,
      tools: {
        getCurrency: currencyTool,
        getWeather: weatherTool,
      },
      temperature: 0.3, 
      toolChoice: 'auto',
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
    let toolCalls: string[] = [];

    for await (const chunk of stream) {
      chunkCount++;
      console.log(`Chunk ${chunkCount}:`, JSON.stringify(chunk, null, 2));
      if (chunk.type === 'tool-call') {
        console.log(`Tool call details: toolName=${chunk.toolName}, input=${JSON.stringify(chunk.input)}`);
        toolCalls.push(chunk.toolName);
      }

      if (chunk.type === 'text-delta') {
        hasText = true;
        res.write(chunk.text);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk.toolName, chunk.input);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result:', chunk.output);
        // Only store valid tool results from known tools
        if (['getCurrency', 'getWeather'].includes(chunk.toolName)) {
          toolResults.push(chunk.output);
        }
      }
    }

    // Handle tool results if no text was streamed
    if (!hasText && toolResults.length > 0) {
      console.log('No text generated, formatting tool results...');
      const lastResult = toolResults[toolResults.length - 1];

      if ('temperature' in lastResult) {
        // Weather result
        const tempSymbol = lastResult.units.temperature === 'fahrenheit' ? 'F' : 'C';
        const response = `Weather in ${lastResult.location}:\n` +
          `Temperature: ${lastResult.temperature}°${tempSymbol}\n` +
          `Feels like: ${lastResult.feels_like}°${tempSymbol}\n` +
          `Humidity: ${lastResult.humidity}%\n` +
          `Wind speed: ${lastResult.wind_speed} ${lastResult.units.wind_speed}\n` +
          `Precipitation: ${lastResult.precipitation} ${lastResult.units.precipitation}`;
        res.write(response);
      } else if ('amount' in lastResult) {
        // Currency result
        const convertedFormatted = Number(lastResult.converted).toFixed(2);
        const response = `${lastResult.amount} ${lastResult.from} is equal to ${convertedFormatted} ${lastResult.to} (exchange rate: ${lastResult.rate} as of ${lastResult.timestamp})`;
        res.write(response);
      }
    } else {
      // Fallback for no text or no valid tool results
      console.log('No valid text or tool results generated, sending fallback...');
      const lastMessage = messages[messages.length - 1]?.content || '';
      const fallbackResponse = lastMessage.toLowerCase().includes('hello')
        ? `Hi! I'm here to help with currency conversions, weather updates, or general questions. Try asking something like "How much is 100 euros in dollars?", "What's the weather in London?", or "What's the biggest animal?".`
        : `Sorry, I couldn't process "${lastMessage}". I can help with currency conversions (e.g., "Convert 100 USD to EUR"), weather (e.g., "What's the weather in Paris?"), or general questions (e.g., "What's the biggest animal?"). Please try again!`;
      res.write(fallbackResponse);
    }

    // Log if fictional tools were attempted
    if (toolCalls.some(tool => !['getCurrency', 'getWeather'].includes(tool))) {
      console.warn('Warning: Model attempted to call fictional tools:', toolCalls);
    }

    res.end();
    console.log(`Stream completed: hasText=${hasText}, toolResults=${toolResults.length}, toolCalls=${toolCalls.join(', ')}`);

  } catch (error) {
    console.error('Chat error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
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
