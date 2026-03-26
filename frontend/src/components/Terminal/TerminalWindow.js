import React from 'react';

export function TerminalWindow({ children }) {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* CRT effect container */}
      <div className="relative rounded-lg overflow-hidden shadow-2xl shadow-[#00ff41]/10">
        {/* Scanline overlay */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
            opacity: 0.03
          }}
        />
        
        {/* Terminal chrome - title bar */}
        <div className="bg-[#1a1a1a] px-4 py-2 flex items-center gap-2 border-b border-[#333]">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          
          {/* Title */}
          <div className="flex-1 text-center">
            <span className="text-[#666] text-xs font-mono tracking-wider">
              CARTOLA LAB STUDIO v0.1
            </span>
          </div>
          
          {/* Spacer for symmetry */}
          <div className="w-12" />
        </div>

        {/* Terminal content area */}
        <div className="bg-black min-h-[600px] p-4 font-mono text-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export default TerminalWindow;
