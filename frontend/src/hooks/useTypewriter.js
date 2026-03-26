import { useState, useCallback, useEffect } from 'react';

export function useTypewriter(text, speed = 30, enabled = true) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled]);

  const skipAnimation = useCallback(() => {
    setDisplayedText(text);
    setIsComplete(true);
  }, [text]);

  return { displayedText, isComplete, skipAnimation };
}

export default useTypewriter;
