import React from 'react';
import { LEAN_CANVAS_BLOCKS } from '../../types/leanCanvas';

export function ProgressDots({ currentBlock, isComplete }) {
  const currentBlockData = LEAN_CANVAS_BLOCKS.find(b => b.id === currentBlock);

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {/* Dots */}
      <div className="flex items-center gap-2">
        {LEAN_CANVAS_BLOCKS.map((block) => (
          <div
            key={block.id}
            className={`
              w-2.5 h-2.5 rounded-full transition-all duration-300
              ${block.id < currentBlock 
                ? 'bg-[#00ff41]' 
                : block.id === currentBlock 
                  ? 'bg-[#00ff41] animate-pulse scale-125' 
                  : 'bg-[#333] border border-[#444]'
              }
            `}
          />
        ))}
      </div>

      {/* Current block name */}
      {!isComplete && currentBlockData && (
        <div className="text-[#666] text-xs font-mono">
          Block {currentBlock} of 9: <span className="text-[#ff6b00]">{currentBlockData.name}</span>
        </div>
      )}

      {isComplete && (
        <div className="text-[#00ff41] text-xs font-mono">
          CANVAS COMPLETE
        </div>
      )}
    </div>
  );
}

export default ProgressDots;
