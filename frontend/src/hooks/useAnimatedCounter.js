import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(target, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const end = typeof target === 'number' ? target : 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (end - start) * eased;
      
      setValue(Number(current.toFixed(decimals)));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevTarget.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, decimals]);

  return value;
}
