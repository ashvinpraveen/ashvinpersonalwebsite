import { useState, useRef, useCallback, useEffect } from "react";

interface UseTimerOptions {
  duration: number; // seconds
  onComplete?: () => void;
}

export function useTimer({ duration, onComplete }: UseTimerOptions) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clear();
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear]);

  const reset = useCallback(() => {
    clear();
    setIsRunning(false);
    setTimeLeft(duration);
  }, [clear, duration]);

  useEffect(() => {
    return clear;
  }, [clear]);

  return { timeLeft, isRunning, start, reset };
}
