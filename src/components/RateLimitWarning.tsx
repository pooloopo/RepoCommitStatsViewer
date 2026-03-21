import { CircleAlert as AlertCircle } from 'lucide-react';
import { Alert } from './ui/alert';
import { useEffect, useState } from 'react';

interface RateLimitWarningProps {
  resetTime: number;
  onRetry?: () => void;
}

export default function RateLimitWarning({ resetTime, onRetry }: RateLimitWarningProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = Math.max(Math.ceil((resetTime - now) / 1000), 0);
      setSecondsRemaining(remaining);

      if (remaining === 0 && onRetry) {
        onRetry();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [resetTime, onRetry]);

  return (
    <Alert className="border-red-900/50 bg-red-950/30 text-red-200 mb-4">
      <AlertCircle className="h-4 w-4" />
      <div className="ml-3">
        <p className="font-semibold">Rate limit exceeded</p>
        <p className="text-sm mt-1">
          Retrying in {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}...
        </p>
      </div>
    </Alert>
  );
}
