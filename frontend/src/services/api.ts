const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatStream = async (
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void
) => {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No reader available');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } catch (error) {
    onError(error as Error);
  }
};
