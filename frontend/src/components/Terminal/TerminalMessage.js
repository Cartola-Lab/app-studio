import React from 'react';
import { useTypewriter } from '../../hooks/useTypewriter';

export function TerminalMessage({ message, isTyping = false }) {
  const { displayedText, isComplete } = useTypewriter(
    message.content,
    25,
    message.sender === 'brostorm' || message.sender === 'system'
  );

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format content with > prefixes for terminal feel
  const formatContent = (text) => {
    return text.split('\n').map((line, i) => (
      <div key={i} className="flex">
        <span className="select-none opacity-50 mr-2">&gt;</span>
        <span>{line || '\u00A0'}</span>
      </div>
    ));
  };

  if (message.sender === 'system') {
    return (
      <div className="text-[#00ff41] opacity-70 text-xs">
        {formatContent(isTyping ? displayedText : message.content)}
        {isTyping && !isComplete && (
          <span className="inline-block w-2 h-4 bg-[#00ff41] ml-1 animate-pulse" />
        )}
      </div>
    );
  }

  if (message.sender === 'brostorm') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#ff6b00] font-bold">[🎩 BroStorm]</span>
          <span className="text-[#333]">{formatTime(message.timestamp)}</span>
        </div>
        <div className="text-[#00ff41] pl-4">
          {formatContent(isTyping ? displayedText : message.content)}
          {isTyping && !isComplete && (
            <span className="inline-block w-2 h-4 bg-[#00ff41] ml-1 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  if (message.sender === 'user') {
    return (
      <div className="space-y-1 text-right">
        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-[#333]">{formatTime(message.timestamp)}</span>
          <span className="text-[#19afff] font-bold">[{message.userName || 'You'}]</span>
        </div>
        <div className="text-[#19afff] pl-8 text-left inline-block">
          {message.content.split('\n').map((line, i) => (
            <div key={i} className="flex justify-end">
              <span>{line || '\u00A0'}</span>
              <span className="select-none opacity-50 ml-2">&lt;</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default TerminalMessage;
