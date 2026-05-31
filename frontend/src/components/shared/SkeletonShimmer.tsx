import { motion } from 'framer-motion';

interface Props {
  className?: string;
  variant?: 'line' | 'card' | 'circle';
  width?: string;
  height?: string;
  count?: number;
}

export default function SkeletonShimmer({ className = '', variant = 'line', width, height, count = 1 }: Props) {
  const items = Array.from({ length: count });
  
  const baseClass = 'skeleton';
  
  const variantStyles: Record<string, string> = {
    line: `${baseClass} h-3 rounded-md`,
    card: `${baseClass} rounded-2xl`,
    circle: `${baseClass} rounded-full`,
  };

  return (
    <>
      {items.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`${variantStyles[variant]} ${className}`}
          style={{ width: width, height: height }}
        />
      ))}
    </>
  );
}
