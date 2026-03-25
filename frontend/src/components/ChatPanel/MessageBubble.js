import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { motion } from 'framer-motion';

const AI_AVATAR = 'https://static.prod-images.emergentagent.com/jobs/a95524e6-8d57-4a33-859d-6152ef3b48ac/images/4af0afd4335574b454a4e79d581adc16fa1dbc777e68934c4cc9938f8310e8d1.png';
const USER_AVATAR = 'https://static.prod-images.emergentagent.com/jobs/a95524e6-8d57-4a33-859d-6152ef3b48ac/images/93483aa331c10d290f7c4b889e75b84a01c78aeb4381d850792e9809a1b1c52c.png';

export function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid={`message-${message.id || message.role}`}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage 
          src={isUser ? USER_AVATAR : AI_AVATAR} 
          alt={isUser ? 'User' : 'BroStorm'} 
        />
        <AvatarFallback className={isUser ? 'bg-[#19AFFF]/20 text-[#19AFFF]' : 'bg-[#1A1A20] text-[#A0A0AB]'}>
          {isUser ? 'U' : 'BS'}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={`
          max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed
          ${isUser 
            ? 'bg-[#19AFFF]/10 border border-[#19AFFF]/20 text-[#EDEDED]' 
            : 'bg-[#1A1A20] border border-[#22222A] text-[#EDEDED]'
          }
        `}
      >
        {isAssistant ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  if (!inline && language) {
                    return (
                      <div className="my-3 rounded-md overflow-hidden border border-[#22222A]">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0A0A0A] border-b border-[#22222A]">
                          <span className="text-xs text-[#A0A0AB] font-mono uppercase">{language}</span>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={language}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '12px',
                            background: '#0A0A0A',
                            fontSize: '13px',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  
                  return (
                    <code className="px-1.5 py-0.5 bg-[#0A0A0A] rounded text-[#19AFFF] text-xs font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0 text-[#EDEDED]">{children}</p>;
                },
                h2({ children }) {
                  return <h2 className="text-lg font-semibold mt-4 mb-2 text-[#EDEDED]">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-base font-semibold mt-3 mb-1 text-[#EDEDED]">{children}</h3>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 text-[#A0A0AB]">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 text-[#A0A0AB]">{children}</ol>;
                },
                li({ children }) {
                  return <li className="mb-1">{children}</li>;
                },
                strong({ children }) {
                  return <strong className="font-semibold text-[#EDEDED]">{children}</strong>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="streaming-cursor" />
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </motion.div>
  );
}

export default MessageBubble;
