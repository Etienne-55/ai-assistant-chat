import { streamText } from 'ai';
import { ToolService } from './tool.service';
import { ollamaConfig } from '../config/ollama.config';

interface ChatRequest {
  message: string;
  pdfPath?: string;
  onChunk: (text: string) => void;
  onComplete: () => void;
}

interface ToolResult {
  toolName: string;
  output: any;
}

export class ChatService {
  constructor(private toolService: ToolService) {}

  async processMessage(request: ChatRequest): Promise<void> {
    const { message, pdfPath, onChunk, onComplete } = request;

    const userMessage = this.prepareMessage(message, pdfPath);
    
    const toolChoice = this.detectIntent(message, !!pdfPath);

    const result = await streamText({
      model: ollamaConfig.model,
      system: this.getSystemPrompt(),
      messages: [{ role: 'user', content: userMessage }],
      tools: this.toolService.getAllTools(),
      temperature: 0.1,
      toolChoice,
    });

    // 4. Process stream
    let hasText = false;
    const toolResults: ToolResult[] = [];

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        hasText = true;
        onChunk(chunk.text);
      } else if (chunk.type === 'tool-call') {
        console.log('Tool called:', chunk.toolName);
      } else if (chunk.type === 'tool-result') {
        // Fix: Type assertion and safer access
        const chunkWithOutput = chunk as any;
        const output = chunkWithOutput.output?.output || chunkWithOutput.output || {};
        toolResults.push({ 
          toolName: chunk.toolName, 
          output 
        });
      }
    }

    if (!hasText && toolResults.length > 0) {
      const formatted = this.formatToolResults(toolResults);
      onChunk(formatted);
    }

    onComplete();
  }

  private prepareMessage(message: string, pdfPath?: string): string {
    const isWeather = /weather|temperature|clima/i.test(message);
    const isCurrency = /convert|currency|euro|dollar/i.test(message);

    if (isWeather) {
      return `${message}\n\n[SYSTEM: Weather query. Use getWeather tool.]`;
    }
    if (isCurrency) {
      return `${message}\n\n[SYSTEM: Currency query. Use getCurrency tool.]`;
    }
    if (pdfPath) {
      return `${message}\n\n[SYSTEM: PDF at ${pdfPath}. Use readPDF tool.]`;
    }
    return message;
  }

  private detectIntent(message: string, hasPdf: boolean): 'auto' | 'required' {
    const needsTool = 
      /weather|temperature|clima/i.test(message) ||
      /convert|currency|euro|dollar/i.test(message) ||
      hasPdf;
    
    return needsTool ? 'required' : 'auto';
  }

  private getSystemPrompt(): string {
    return `You are a helpful AI assistant with access to real-time tools.

RULES:
1. Use tools when instructed by [SYSTEM: ...] messages
2. After using tools, explain results in natural language
3. For general questions, respond directly

Be concise and helpful.`;
  }



private formatToolResults(results: ToolResult[]): string {
  if (results.length === 0) {
    return 'No results to format';
  }

  const lastResult = results[results.length - 1];
  
  if (!lastResult) {
    return 'Unable to format response';
  }

  let { toolName, output } = lastResult;

  // Parse output if it's a string
  if (typeof output === 'string') {
    try {
      output = JSON.parse(output);
    } catch (e) {
      console.log('Failed to parse output as JSON:', output);
      return 'Unable to format response';
    }
  }

  // Debug: Log the actual structure
  console.log('Formatting tool result:', { 
    toolName, 
    outputType: typeof output,
    outputKeys: output ? Object.keys(output) : [],
    hasTemperature: output && 'temperature' in output,
    fullOutput: JSON.stringify(output)
  });

  // Check if output exists
  if (!output || typeof output !== 'object') {
    console.log('Output is null or not an object');
    return 'Unable to format response';
  }

  // Check for error first
  if ('error' in output && output.error) {
    return `Error: ${output.error}`;
  }

  // Weather
  if (toolName === 'getWeather' && 'temperature' in output) {
    const temp = output.units?.temperature === 'fahrenheit' ? '°F' : '°C';
    return (
      `The weather in ${output.location}:\n\n` +
      `Temperature: ${output.temperature}${temp}\n` +
      `Feels like: ${output.feels_like}${temp}\n` +
      `Humidity: ${output.humidity}%\n` +
      `Precipitation: ${output.precipitation}mm\n` +
      `Wind speed: ${output.wind_speed} ${output.units?.wind_speed || 'km/h'}`
    );
  }

  // Currency
  if (toolName === 'getCurrency' && 'converted' in output) {
    return (
      `${output.amount} ${output.from} equals ` +
      `${Number(output.converted).toFixed(2)} ${output.to}\n` +
      `Exchange rate: ${output.rate}`
    );
  }

  // PDF
  if (toolName === 'readPDF') {
    if (output.success && 'content' in output) {
      const preview = output.content?.substring(0, 1500) || '';
      return `Here's what I found in the PDF:\n\n${preview}...`;
    } else if (!output.success && 'error' in output) {
      return `Sorry, I couldn't read the PDF: ${output.error}`;
    }
  }

  console.log('No matching formatter found for:', toolName);
  return `Unable to format response for tool: ${toolName}`;
}

}
