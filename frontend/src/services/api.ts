const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const chatStream = async (
  messages: ChatMessage[],
  pdfFile: File | null,
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void
) => {
  try {
    const formData = new FormData();
    
    const lastMessage = messages[messages.length - 1];
    formData.append('message', lastMessage.content);
    
    if (pdfFile) {
      formData.append('pdf', pdfFile);
    }

    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      body: formData, 
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

