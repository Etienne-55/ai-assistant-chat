import { Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-tokyo-comment">
          <Bot className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">Start a conversation...</p>
          <p className="text-sm mt-2">Ask about weather, currency, or upload a PDF</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'assistant' ? 'justify-start' : 'justify-end'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tokyo-purple/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-tokyo-purple" />
              </div>
            )}
            
            <div
              className={`max-w-[70%] px-4 py-3 rounded-lg ${
                message.role === 'assistant'
                  ? 'bg-tokyo-bgHighlight border border-tokyo-terminal'
                  : 'bg-tokyo-blue text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-50 mt-1 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tokyo-blue/20 flex items-center justify-center">
                <User className="w-5 h-5 text-tokyo-blue" />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
