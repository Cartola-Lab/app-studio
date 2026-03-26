import React, { useState, useRef, useEffect } from 'react';

export function TerminalInput({ onSend, disabled = false, placeholder = "Type your answer..." }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border border-[#1a1a1a] border-b-[#00ff41] bg-transparent p-3 flex items-center gap-2">
      <span className="text-[#00ff41] select-none">&gt;</span>
      <input
        ref={inputRef}
        data-testid="terminal-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? "Processing..." : placeholder}
        className="
          flex-1 bg-transparent border-none outline-none
          text-[#e4e4e7] placeholder:text-[#333]
          font-mono text-sm
          caret-[#00ff41]
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        autoComplete="off"
        spellCheck="false"
      />
      <button
        data-testid="terminal-send-btn"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="
          text-[#00ff41] hover:text-[#00ff41]/80
          disabled:text-[#333] disabled:cursor-not-allowed
          transition-colors text-lg font-bold
        "
      >
        ⏎
      </button>
      
      {/* Blinking cursor effect when input is empty */}
      {!value && !disabled && (
        <span className="absolute left-10 text-[#00ff41] animate-pulse pointer-events-none">_</span>
      )}
    </div>
  );
}

export default TerminalInput;
