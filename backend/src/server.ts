import express, { Request, Response } from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { currencyTool } from './tools/currency.tool';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configure Ollama as OpenAI-compatible provider
const ollama = createOpenAI({
  name: 'ollama',
  apiKey: 'ollama', // Ollama doesn't require a real API key
  baseURL: 'http://localhost:11434/v1',
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Main chat endpoint
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
      model: ollama.chat('mistral:7b'),
      messages,
      tools: {
        getCurrency: currencyTool,
      },
      // maxToolRoundtrips: 5,
    });

    console.log('Setting up stream...');
    
    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use fullStream to see tool calls and text
    const stream = result.fullStream;
    
    console.log('Starting to stream...');
    let chunkCount = 0;
    let hasText = false;
    let toolResults: any[] = [];
    
    for await (const chunk of stream) {
      chunkCount++;
      console.log(`Chunk ${chunkCount}:`, JSON.stringify(chunk, null, 2));
      
      // Only send text deltas to the client
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

    // If no text was generated, create a response from tool results
    if (!hasText && toolResults.length > 0) {
      console.log('No text generated, formatting tool results...');
      const lastResult = toolResults[toolResults.length - 1];
      
      if (lastResult.error) {
        res.write(`Error: ${lastResult.error}`);
      } else {
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Using Ollama local server`);
});

