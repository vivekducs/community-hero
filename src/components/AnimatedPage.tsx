import { motion } from 'motion/react';
import { ReactNode } from 'react';

export default function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
