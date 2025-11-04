import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const MessageInput = ({ onSend, disabled }: MessageInputProps) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-tokyo-terminal">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about weather, currency, or PDFs..."
          disabled={disabled}
          className="flex-1 px-4 py-3 bg-tokyo-bgHighlight border border-tokyo-terminal rounded-lg 
                   text-tokyo-fg placeholder-tokyo-comment focus:outline-none focus:border-tokyo-blue
                   transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="px-6 py-3 bg-tokyo-purple hover:bg-tokyo-purple/80 text-white rounded-lg 
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </form>
  );
};
