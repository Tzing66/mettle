import { useEffect, useState } from 'react';

import { Text, type TextProps } from '@/design/components';

/** Counts from 0 to `value` after `delay` ms, easing out. */
export function CountUp({ value, delay = 0, duration = 600, prefix = '', ...text }: TextProps & { value: number; delay?: number; duration?: number; prefix?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay, duration]);

  return (
    <Text tabular {...text}>
      {prefix}
      {shown.toLocaleString()}
    </Text>
  );
}
