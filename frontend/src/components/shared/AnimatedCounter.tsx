import { useEffect, useRef, useState } from 'react';

interface Props {
  end: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({ end, decimals = 0, duration = 1200, prefix = '', suffix = '', className = '' }: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const t0 = performance.now();
    const animate = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);

  return (
    <span className={`font-financial ${className}`}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
