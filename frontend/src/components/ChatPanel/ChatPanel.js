import React, { useRef, useEffect } from 'react';
import { useStudio } from '../../context/StudioContext';
import { streamChat } from '../../services/chatApi';
import { parseCodeForPreview, extractBriefing, hasCodeBlocks } from '../../utils/codeExtractor';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '../ui/scroll-area';
import { Bot } from 'lucide-react';

export function ChatPanel() {
  const { 
    state, 
    addMessage, 
    updateStreamingMessage, 
    setStreaming, 
    updatePreview,
    setBriefing
  } = useStudio();
  
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.isStreaming]);

  const handleSendMessage = async (content) => {
    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    addMessage(userMessage);

    // Create placeholder for assistant response
    const assistantMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    addMessage(assistantMessage);
    setStreaming(true);

    let fullResponse = '';

    await streamChat(
      [...state.messages, userMessage],
      state.sessionId,
      // onChunk
      (chunk) => {
        fullResponse += chunk;
        updateStreamingMessage(chunk);
        
        // Check for code blocks and update preview in real-time
        if (hasCodeBlocks(fullResponse)) {
          const preview = parseCodeForPreview(fullResponse);
          if (preview.html || preview.css || preview.js) {
            updatePreview(preview);
          }
        }
      },
      // onComplete
      () => {
        setStreaming(false);
        
        // Final check for briefing
        const briefing = extractBriefing(fullResponse);
        if (briefing) {
          setBriefing(briefing);
        }
      },
      // onError
      (error) => {
        setStreaming(false);
        updateStreamingMessage(`\n\n*Error: ${error.message}*`);
      }
    );
  };

  return (
    <div 
      data-testid="chat-panel"
      className="flex-1 flex flex-col min-w-[300px] bg-[#111115] border-r border-[#22222A] overflow-hidden"
    >
      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="p-4 space-y-4">
          {state.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#19AFFF]/10 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-[#19AFFF]" />
              </div>
              <h3 className="text-lg font-semibold text-[#EDEDED] mb-2">
                Welcome to Cartola Lab Studio
              </h3>
              <p className="text-sm text-[#A0A0AB] max-w-sm">
                I'm BroStorm, your AI product strategist. Tell me about the app you want to build, 
                and I'll help you create a visual prototype and structured briefing.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {['Landing page', 'Dashboard', 'Mobile app', 'E-commerce'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(`I want to build a ${suggestion.toLowerCase()}`)}
                    className="px-3 py-1.5 text-xs bg-[#1A1A20] border border-[#22222A] rounded-md text-[#A0A0AB] hover:text-[#EDEDED] hover:border-[#19AFFF]/50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {state.messages.map((message, index) => (
                <MessageBubble
                  key={message.id || index}
                  message={message}
                  isStreaming={state.isStreaming && index === state.messages.length - 1 && message.role === 'assistant'}
                />
              ))}
              {state.isStreaming && state.messages[state.messages.length - 1]?.role !== 'assistant' && (
                <StreamingIndicator />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput 
        onSend={handleSendMessage} 
        disabled={state.isStreaming} 
      />
    </div>
  );
}

export default ChatPanel;
