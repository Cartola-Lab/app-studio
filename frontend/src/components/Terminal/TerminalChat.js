import React, { useEffect, useRef } from 'react';
import { TerminalMessage } from './TerminalMessage';
import { ScrollArea } from '../ui/scroll-area';

export function TerminalChat({ messages, isTyping, currentTypingId }) {
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <ScrollArea className="flex-1 h-[400px]">
      <div className="space-y-4 pr-4">
        {messages.map((message, index) => (
          <TerminalMessage
            key={message.id}
            message={message}
            isTyping={isTyping && index === messages.length - 1 && currentTypingId === message.id}
          />
        ))}
        
        {isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'user' && (
          <div className="flex items-center gap-2 text-[#00ff41]">
            <span className="text-[#ff6b00]">[🎩 BroStorm]</span>
            <span className="animate-pulse">▊</span>
          </div>
        )}
        
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}

export default TerminalChat;
