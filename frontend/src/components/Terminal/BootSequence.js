import React, { useState, useEffect, useRef } from 'react';

const BOOT_LINES = [
  { text: "CARTOLA LAB STUDIO v0.1", delay: 0 },
  { text: "Initializing BroStorm engine...", delay: 300 },
  { text: "Loading project modules... ", delay: 600, loading: true },
  { text: "Connecting to AI core... OK", delay: 1500 },
  { text: "", delay: 1800 },
  { text: "System ready.", delay: 2000 },
  { text: "", delay: 2200 }
];

export function BootSequence({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timers = [];
    const intervals = [];
    
    BOOT_LINES.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(prev => {
          // Prevent duplicates by checking if line already exists
          if (prev.some(l => l.id === index)) return prev;
          return [...prev, { ...line, id: index }];
        });
        
        if (line.loading) {
          setShowLoading(true);
          let progress = 0;
          const loadingInterval = setInterval(() => {
            progress += 10;
            setLoadingProgress(progress);
            if (progress >= 100) {
              clearInterval(loadingInterval);
              setShowLoading(false);
            }
          }, 80);
          intervals.push(loadingInterval);
        }
      }, line.delay);
      timers.push(timer);
    });

    // Complete after all lines
    const totalDelay = BOOT_LINES[BOOT_LINES.length - 1].delay + 500;
    const completeTimer = setTimeout(() => {
      if (!completed) {
        setCompleted(true);
        onComplete();
      }
    }, totalDelay);
    timers.push(completeTimer);
    
    // Cleanup
    return () => {
      timers.forEach(t => clearTimeout(t));
      intervals.forEach(i => clearInterval(i));
    };
  }, []); // Empty deps - run once on mount

  const renderLoadingBar = () => {
    const filled = Math.floor(loadingProgress / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return bar;
  };

  return (
    <div className="font-mono text-sm space-y-1 text-[#00ff41]">
      {visibleLines.map((line) => (
        <div key={line.id} className="flex items-center">
          <span className="text-[#666] select-none mr-2">&gt;</span>
          <span>
            {line.text}
            {line.loading && showLoading && (
              <span className="text-[#00ff41]">{renderLoadingBar()} OK</span>
            )}
            {line.loading && !showLoading && loadingProgress >= 100 && (
              <span className="text-[#00ff41]">{'█'.repeat(10)} OK</span>
            )}
          </span>
        </div>
      ))}
      
      {visibleLines.length > 0 && visibleLines.length < BOOT_LINES.length && (
        <span className="inline-block w-2 h-4 bg-[#00ff41] animate-pulse ml-4" />
      )}
    </div>
  );
}

export default BootSequence;
