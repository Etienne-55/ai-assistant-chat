import { useState } from 'react';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { PdfUpload } from '../components/PdfUpload';
import { chatStream } from '../services/api';
import { LogOut, Bot } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  user: User;
  onLogout: () => void;
}

export const Chat = ({ user, onLogout }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);

  const handlePdfSelect = (file: File | null) => {
    if (file) {
      setUploadedPdf(file);
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `PDF uploaded: ${file.name}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } else {
      setUploadedPdf(null);
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: 'PDF removed',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  };

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantMessageId = (Date.now() + 1).toString();
    let assistantContent = '';

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    await chatStream(
      [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      })),
      uploadedPdf,
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: assistantContent }
              : m
          )
        );
      },
      (error) => {
        console.error('Stream error:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: 'Error: Failed to get response' }
              : m
          )
        );
      }
    );

    setIsStreaming(false);
  };

  return (
    <div className="min-h-screen bg-tokyo-bg flex flex-col">
      {/* Header */}
      <header className="bg-tokyo-bgHighlight border-b border-tokyo-terminal px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-tokyo-purple/20 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-tokyo-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-tokyo-fg">Agentic Assistant</h1>
              <p className="text-sm text-tokyo-comment">Weather • Currency • PDF Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-tokyo-fgDark">Hello, {user.name}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-tokyo-red hover:bg-tokyo-red/10 
                       rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col bg-tokyo-bgDark">
        <MessageList messages={messages} />
        
        <div className="border-t border-tokyo-terminal p-4">
          <PdfUpload onPdfSelect={handlePdfSelect} currentFile={uploadedPdf} />
          <MessageInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
};
