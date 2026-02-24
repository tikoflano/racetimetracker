import { useState, useEffect } from 'react';
import { formatElapsed } from '../utils';

interface Props {
  startTime: number;
  className?: string;
}

export default function ElapsedTimer({ startTime, className = 'elapsed' }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  const elapsed = now - startTime;
  return <span className={className}>{formatElapsed(elapsed)}</span>;
}
