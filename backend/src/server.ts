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
      // tools: {
      //   getCurrency: currencyTool,
      // },
      // maxSteps: 5,
    });

    console.log('Setting up stream...');
    
    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use the text stream directly
    const stream = result.textStream;
    
    console.log('Starting to stream...');
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      chunkCount++;
      console.log(`Chunk ${chunkCount}:`, chunk);
      res.write(chunk);
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

