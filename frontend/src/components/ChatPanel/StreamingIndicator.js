import React from 'react';
import { motion } from 'framer-motion';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[#A0A0AB] text-sm">
      <motion.div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-[#19AFFF] rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
      <span>BroStorm is thinking...</span>
    </div>
  );
}

export default StreamingIndicator;
