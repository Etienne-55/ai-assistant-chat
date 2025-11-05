import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { currencyTool } from './tools/currency.tool';
import { weatherTool } from './tools/weather.tool';
import { pdfTool } from './tools/pdf.tool';
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/chat', upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const pdfFile = req.file;

    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('PDF file:', pdfFile ? pdfFile.filename : 'none');

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build messages array
    let userMessage = message;
    
    // Add PDF context if uploaded
    if (pdfFile) {
      userMessage = `${message}\n\n[System: User has uploaded a PDF file located at: ${pdfFile.path}. Use the readPDF tool to analyze it.]`;
      console.log('PDF uploaded at:', pdfFile.path);
    }

    const messages = [
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    console.log('Starting streamText...');

    const systemPrompt = `You are a helpful assistant that prioritizes direct, concise, and accurate text responses for all queries unless explicitly required to use a tool. ONLY use the 'getCurrency' tool for queries explicitly mentioning currency conversion (e.g., "Convert 100 USD to EUR") and the 'getWeather' tool for queries explicitly mentioning weather or a location's climate (e.g., "What's the weather in London?"). Use the 'readPDF' tool ONLY when a PDF file path is mentioned in the system message or when the user asks questions about an uploaded PDF document. For greetings (e.g., "Hello", "Hi") or general knowledge questions (e.g., "What's the biggest animal?", "What's the fastest car?"), ALWAYS provide a direct text response and DO NOT invoke any tools, even if the query mentions avoiding tools. Never invent or assume the existence of tools not provided. Avoid technical terms like "JSON", "function call", or "tool" in your answers.`;

    const result = await streamText({
      model: ollama.chat('qwen2.5:3b-instruct-q4_K_M'),
      system: systemPrompt,
      messages,
      tools: {
        getCurrency: currencyTool,
        getWeather: weatherTool,
        readPDF: pdfTool,
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
    let hasText = false;
    let toolResults: any[] = [];
    let toolCalls: string[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') {
        hasText = true;
        res.write(chunk.text);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk.toolName);
        toolCalls.push(chunk.toolName);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result received for:', chunk.toolName);
        if (['getCurrency', 'getWeather', 'readPDF'].includes(chunk.toolName)) {
          toolResults.push({ toolName: chunk.toolName, output: chunk.output });
        }
      }
    }

    if (!hasText && toolResults.length > 0) {
      const lastResult = toolResults[toolResults.length - 1];
      const output = lastResult.output;
      
      if (lastResult.toolName === 'getWeather' && 'temperature' in output) {
        const tempSymbol = output.units.temperature === 'fahrenheit' ? 'F' : 'C';
        res.write(
          `Weather in ${output.location}:\n` +
          `Temperature: ${output.temperature}°${tempSymbol}\n` +
          `Feels like: ${output.feels_like}°${tempSymbol}\n` +
          `Humidity: ${output.humidity}%\n` +
          `Wind speed: ${output.wind_speed} ${output.units.wind_speed}`
        );
      } else if (lastResult.toolName === 'getCurrency' && 'amount' in output) {
        res.write(
          `${output.amount} ${output.from} = ${Number(output.converted).toFixed(2)} ${output.to}\n` +
          `(Rate: ${output.rate} on ${output.timestamp})`
        );
      } else if (lastResult.toolName === 'readPDF' && 'content' in output) {
        res.write(`PDF Analysis:\n${output.content.substring(0, 500)}...`);
      }
    }
    
    res.end();

    console.log(`Stream completed: hasText=${hasText}, toolResults=${toolResults.length}, toolCalls=${toolCalls.join(', ')}`);

    // Optional: Clean up PDF file after processing
    // if (pdfFile && fs.existsSync(pdfFile.path)) {
    //   fs.unlinkSync(pdfFile.path);
    // }

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
