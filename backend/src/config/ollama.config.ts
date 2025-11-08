import { createOpenAI } from '@ai-sdk/openai';

const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

const ollama = createOpenAI({
  name: 'ollama',
  apiKey: 'ollama',
  baseURL: `${ollamaURL}/v1`,
});

export const ollamaConfig = {
  model: ollama.chat('qwen2.5:1.5b-instruct-q4_K_M'),
  baseURL: ollamaURL,
};
