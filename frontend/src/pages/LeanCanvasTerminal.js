import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TerminalWindow, 
  TerminalChat, 
  TerminalInput, 
  ProgressDots, 
  BootSequence 
} from '../components/Terminal';
import { useLeanCanvas } from '../hooks/useLeanCanvas';
import { LEAN_CANVAS_BLOCKS } from '../types/leanCanvas';
import { streamChat } from '../services/chatApi';
import { motion, AnimatePresence } from 'framer-motion';

// Terminal-specific BroStorm prompt
const BROSTORM_TERMINAL_SYSTEM_PROMPT = `You are BroStorm, the Product Strategist at Cartola Laboratory Co.

You are currently in TERMINAL MODE — guiding a user through a Lean Canvas to define their project scope before entering the Studio.

PERSONALITY:
- You speak like a seasoned startup mentor in a terminal
- Casual but sharp. Direct. No fluff.
- Keep responses SHORT — 2-4 lines max per message
- You speak Portuguese (Brazil) with the user

RULES:
1. Ask the primary question for the current block
2. If the user's answer is too vague, ask ONE follow-up to get specifics
3. If the answer is clear enough, summarize in one line and say "Moving on..." or "Let's continue..."
4. NEVER skip blocks unless the user explicitly asks
5. Be encouraging but challenge weak answers — "Isso está vago. Me dá um exemplo específico."
6. After summarizing each answer, tell the user you're moving to the next block

When transitioning between blocks, use this format:
"Good. [brief summary]. Moving on to the next block."

Keep the terminal vibe - short, punchy, like a CLI mentor.`;

function LeanCanvasTerminal() {
  const navigate = useNavigate();
  const {
    state,
    addMessage,
    setTyping,
    advanceBlock,
    setAnswer,
    setBootComplete,
    getCurrentBlock,
    getCanvasData
  } = useLeanCanvas();

  const [sessionId] = useState(`terminal-${Date.now()}`);
  const [currentTypingId, setCurrentTypingId] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [welcomeSent, setWelcomeSent] = useState(false);

  // Handle boot sequence completion - called only once
  const handleBootComplete = useCallback(() => {
    if (welcomeSent) return; // Guard against double execution
    setWelcomeSent(true);
    setBootComplete();
    
    // Add welcome message from BroStorm
    setTimeout(() => {
      addMessage({
        sender: 'brostorm',
        content: `Olá! I'm BroStorm.
Let's define your project before we build.
I'll guide you through 9 quick questions — the Lean Canvas.

Ready? Let's go.`
      });

      // Add first block question after a delay
      setTimeout(() => {
        const firstBlock = LEAN_CANVAS_BLOCKS[0];
        addMessage({
          sender: 'brostorm',
          content: `██ BLOCK 1/9: ${firstBlock.name} ${firstBlock.icon}

${firstBlock.primaryQuestion}`,
          blockNumber: 1
        });
      }, 2000);
    }, 500);
  }, [welcomeSent, addMessage, setBootComplete]);

  // Handle user message submission
  const handleSendMessage = useCallback(async (content) => {
    // Add user message
    addMessage({
      sender: 'user',
      content,
      userName: state.userName
    });

    // Store the answer
    const currentBlock = getCurrentBlock();
    setAnswer(currentBlock.key, content);

    setTyping(true);

    // Build context for AI
    const currentBlockNum = state.currentBlock;
    const block = LEAN_CANVAS_BLOCKS[currentBlockNum - 1];
    
    const contextMessage = `CURRENT BLOCK: ${block.name} (${block.id}/9)
BLOCK QUESTION: ${block.primaryQuestion}
USER'S ANSWER: ${content}

Provide a brief acknowledgment of their answer (1-2 lines max). If the answer is good enough, summarize it briefly and indicate you're moving to the next block. If it's too vague, ask ONE specific follow-up question.

Remember: Keep it SHORT. Terminal style. Portuguese with the user.`;

    // Build messages for AI
    const messages = [
      ...state.conversation
        .filter(m => m.sender !== 'system')
        .slice(-6)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
      {
        role: 'user',
        content: contextMessage
      }
    ];

    let fullResponse = '';
    const messageId = `brostorm-${Date.now()}`;

    // Add placeholder for BroStorm response
    addMessage({
      id: messageId,
      sender: 'brostorm',
      content: ''
    });
    setCurrentTypingId(messageId);

    await streamChat(
      messages,
      sessionId,
      // onChunk
      (chunk) => {
        fullResponse += chunk;
      },
      // onComplete
      () => {
        setTyping(false);
        setCurrentTypingId(null);
        
        // Update the message with full content
        addMessage({
          sender: 'brostorm',
          content: fullResponse
        });

        // Check if we should advance to next block
        const shouldAdvance = fullResponse.toLowerCase().includes('moving on') ||
                             fullResponse.toLowerCase().includes('próximo bloco') ||
                             fullResponse.toLowerCase().includes('next block') ||
                             fullResponse.toLowerCase().includes('let\'s continue') ||
                             fullResponse.toLowerCase().includes('vamos continuar');

        if (shouldAdvance && currentBlockNum < 9) {
          setTimeout(() => {
            advanceBlock();
            
            // Add next block question
            setTimeout(() => {
              const nextBlock = LEAN_CANVAS_BLOCKS[currentBlockNum];
              addMessage({
                sender: 'brostorm',
                content: `██ BLOCK ${nextBlock.id}/9: ${nextBlock.name} ${nextBlock.icon}

${nextBlock.primaryQuestion}`,
                blockNumber: nextBlock.id
              });
            }, 500);
          }, 1000);
        } else if (shouldAdvance && currentBlockNum === 9) {
          // Canvas complete!
          setTimeout(() => {
            handleCanvasComplete();
          }, 1000);
        }
      },
      // onError
      (error) => {
        setTyping(false);
        setCurrentTypingId(null);
        addMessage({
          sender: 'brostorm',
          content: `Error: ${error.message}. Let's try again.`
        });
      }
    );
  }, [state, addMessage, setTyping, setAnswer, advanceBlock, getCurrentBlock, sessionId]);

  // Handle canvas completion
  const handleCanvasComplete = useCallback(() => {
    addMessage({
      sender: 'brostorm',
      content: `██ PROJECT SCOPE COMPLETE

Lean Canvas locked and loaded.
All 9 blocks defined.

Launching Studio with your project context...`
    });

    // Show enter button after a delay
    setTimeout(() => {
      setTransitioning(true);
    }, 1500);
  }, [addMessage]);

  // Handle skip canvas
  const handleSkipCanvas = useCallback(() => {
    addMessage({
      sender: 'system',
      content: 'Skipping Lean Canvas. Entering Studio in raw mode...'
    });

    setTimeout(() => {
      navigate('/studio', {
        state: {
          leanCanvas: null,
          skipped: true
        }
      });
    }, 1500);
  }, [addMessage, navigate]);

  // Handle enter studio
  const handleEnterStudio = useCallback(() => {
    const canvasData = getCanvasData();
    
    navigate('/studio', {
      state: {
        leanCanvas: canvasData.leanCanvas,
        skipped: false
      }
    });
  }, [navigate, getCanvasData]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono">
      {/* Scanline overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,255,65,0.01) 0px, rgba(0,255,65,0.01) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <TerminalWindow>
        {/* Boot sequence */}
        {!state.bootComplete && (
          <BootSequence onComplete={handleBootComplete} />
        )}

        {/* Main chat area */}
        {state.bootComplete && (
          <>
            <TerminalChat 
              messages={state.conversation}
              isTyping={state.isTyping}
              currentTypingId={currentTypingId}
            />

            {/* Input area */}
            {!state.isComplete && !transitioning && (
              <div className="mt-4">
                <TerminalInput
                  onSend={handleSendMessage}
                  disabled={state.isTyping}
                  placeholder="Type your answer..."
                />
              </div>
            )}

            {/* Enter Studio button */}
            <AnimatePresence>
              {transitioning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 text-center"
                >
                  <button
                    data-testid="enter-studio-btn"
                    onClick={handleEnterStudio}
                    className="
                      px-8 py-3 bg-transparent border-2 border-[#00ff41]
                      text-[#00ff41] font-mono text-lg
                      hover:bg-[#00ff41] hover:text-black
                      transition-all duration-300
                      animate-pulse
                    "
                  >
                    [ Enter Studio → ]
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress dots */}
            <div className="mt-4 border-t border-[#1a1a1a] pt-4">
              <ProgressDots 
                currentBlock={state.currentBlock} 
                isComplete={state.isComplete}
              />
            </div>

            {/* Skip button */}
            {!state.isComplete && !transitioning && (
              <div className="mt-4 text-center">
                <button
                  data-testid="skip-canvas-btn"
                  onClick={handleSkipCanvas}
                  className="
                    text-[#333] text-xs font-mono
                    border border-[#333] px-4 py-2
                    hover:border-[#19afff] hover:text-[#19afff]
                    transition-colors
                  "
                >
                  [ Skip the Lean Canvas → ]
                </button>
              </div>
            )}
          </>
        )}
      </TerminalWindow>

      {/* Version tag */}
      <div className="mt-4 text-[#333] text-xs font-mono">
        Cartola Laboratory Co. © 2025
      </div>
    </div>
  );
}

export default LeanCanvasTerminal;
