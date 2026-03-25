import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Send } from 'lucide-react';

export function ChatInput({ onSend, disabled = false }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150); // Max 6 lines approx
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  return (
    <div 
      data-testid="chat-input-container"
      className="p-4 border-t border-[#22222A] bg-[#111115]"
    >
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            data-testid="chat-input-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your app idea to BroStorm..."
            disabled={disabled}
            rows={1}
            className="
              min-h-[44px] max-h-[150px] resize-none
              bg-[#0A0A0A] border-[#22222A] 
              text-[#EDEDED] placeholder:text-[#6A6A75]
              focus-visible:ring-1 focus-visible:ring-[#19AFFF] focus-visible:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>
        <Button
          data-testid="chat-submit-btn"
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="
            h-11 px-4
            bg-[#19AFFF] hover:bg-[#40BDFF] 
            text-white font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            btn-lift
          "
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-[#6A6A75] mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-[#1A1A20] rounded text-[#A0A0AB]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#1A1A20] rounded text-[#A0A0AB]">Enter</kbd> to send
      </p>
    </div>
  );
}

export default ChatInput;
