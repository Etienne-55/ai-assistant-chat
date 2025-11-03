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

// Configure LM Studio as OpenAI-compatible provider
const lmstudio = createOpenAI({
  name: 'lmstudio',
  apiKey: 'lm-studio', // LM Studio doesn't require a real API key
  baseURL: 'http://localhost:1234/v1',
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

    const result = streamText({
      model: lmstudio.chat('qwen/qwen2.5-coder-14b'),
      messages,
      tools: {
        getCurrency: currencyTool,
      },
    });

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    const stream = result.toTextStreamResponse();
    
    const reader = stream.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Using LM Studio local server`);
});
