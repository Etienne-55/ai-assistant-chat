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

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  limits: { fileSize: 10 * 1024 * 1024 } 
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

    let userMessage = message;
    let toolChoice: 'auto' | 'required' = 'auto';
    
    const isWeatherQuery = /weather|temperature|clima|temp|forecast/i.test(message);
    const isCurrencyQuery = /convert|currency|euro|dollar|usd|eur|gbp|brl|pound|exchange/i.test(message) && /\d/.test(message);
    
    if (isWeatherQuery) {
      userMessage = `${message}\n\n[SYSTEM INSTRUCTION: This is a weather query. You MUST call the getWeather tool immediately with the location name. Do not provide weather information from memory. After getting the tool result, format it nicely for the user.]`;
      toolChoice = 'required';
    } else if (isCurrencyQuery) {
      userMessage = `${message}\n\n[SYSTEM INSTRUCTION: This is a currency conversion query. You MUST call the getCurrency tool immediately. After getting the result, format it nicely for the user.]`;
      toolChoice = 'required';
    } else if (pdfFile) {
      userMessage = `${message}\n\n[SYSTEM INSTRUCTION: User uploaded PDF at: ${pdfFile.path}. You MUST call the readPDF tool first, then analyze the content and provide a detailed response.]`;
      toolChoice = 'required';
      console.log('PDF uploaded at:', pdfFile.path);
    }

    const messages = [
      {
        role: 'user' as const,
        content: userMessage
      }
    ];

    console.log('Starting streamText...');

    const systemPrompt = `You are a helpful AI assistant with access to real-time tools.
    CRITICAL RULES:
    1. When you see [SYSTEM INSTRUCTION: ...], follow it immediately
    2. For weather: ALWAYS use getWeather tool, then explain the results
    3. For currency: ALWAYS use getCurrency tool, then explain the results  
    4. For PDFs: ALWAYS use readPDF tool first, then summarize
    5. After using ANY tool, you MUST provide a natural language response explaining the results
    6. NEVER say "I will use a tool" - just use it, then explain the results
    Example flow:
    User: "What's the weather in London?"
    You: [use getWeather tool] → "The weather in London is currently 15°C with partly cloudy skies..."
    For greetings or general questions without tools, respond normally.`;

    const result = await streamText({
      model: ollama.chat('qwen2.5:1.5b-instruct-q4_K_M'),
      system: systemPrompt,
      messages,
      tools: {
        getCurrency: currencyTool,
        getWeather: weatherTool,
        readPDF: pdfTool,
      },
      temperature: 0.1,
      toolChoice: toolChoice,
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
      console.log('Chunk type:', chunk.type);
      
      if (chunk.type === 'text-delta') {
        hasText = true;
        res.write(chunk.text);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool call:', chunk.toolName);
        toolCalls.push(chunk.toolName);
      } else if (chunk.type === 'tool-result') {
        console.log('Tool result for:', chunk.toolName);
        
        // The result is in chunk.result (for ai sdk 3.x) or chunk itself
        const resultData = 'result' in chunk ? (chunk as any).result : chunk;
        
        console.log('Result data:', JSON.stringify(resultData, null, 2));
        
        toolResults.push({ 
          toolName: chunk.toolName, 
          output: resultData
        });
      }
    }

  if (!hasText && toolResults.length > 0) {
    console.log('No text generated, formatting tool results manually...');
    console.log('Tool results:', JSON.stringify(toolResults, null, 2));
    
    const lastResult = toolResults[toolResults.length - 1];
    const output = lastResult.output?.output || lastResult.output;
    
    if (output && typeof output === 'object' && 'error' in output) {
      res.write(`Error: ${output.error}`);
    } else if (lastResult.toolName === 'getWeather' && output && typeof output === 'object' && 'temperature' in output) {
      const tempSymbol = output.units?.temperature === 'fahrenheit' ? '°F' : '°C';
      res.write(
        `The weather in ${output.location}:\n\n` +
        `Temperature: ${output.temperature}${tempSymbol}\n` +
        `Feels like: ${output.feels_like}${tempSymbol}\n` +
        `Humidity: ${output.humidity}%\n` +
        `Precipitation: ${output.precipitation}mm\n` +
        `Wind speed: ${output.wind_speed} ${output.units?.wind_speed || 'km/h'}`
      );
    } else if (lastResult.toolName === 'getCurrency' && output && typeof output === 'object' && 'amount' in output) {
      res.write(
        `${output.amount} ${output.from} equals ${Number(output.converted).toFixed(2)} ${output.to}\n` +
        `Exchange rate: ${output.rate} (as of ${output.timestamp})`
      );
    } else if (lastResult.toolName === 'readPDF' && output && typeof output === 'object') {
      if (output.success && 'content' in output) {
        const content = output.content.substring(0, 1500);
        res.write(`Here's what I found in the PDF:\n\n${content}${output.content.length > 1500 ? '...\n\n(showing first 1500 characters)' : ''}`);
      } else {
        res.write(`Sorry, I couldn't read the PDF: ${output.error || 'Unknown error'}`);
      }
    } else {
      console.log('Unhandled output format:', output);
      res.write(`I received a response but couldn't format it properly.`);
    }
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
  console.log(`Using Ollama at ${ollamaURL}`);
});

