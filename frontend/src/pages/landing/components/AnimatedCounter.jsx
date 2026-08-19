import { useEffect, useState } from 'react';

export default function AnimatedCounter({ value, suffix = '', duration = 1200 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(value * progress));

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(rafId);
  }, [duration, value]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
