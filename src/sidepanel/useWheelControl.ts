import { useEffect, useRef } from 'react';

interface WheelControlOptions {
  enabled: boolean;
  disabled?: boolean;
  onDelta: (delta: number, isShift: boolean) => void;
}

export function useWheelControl<T extends HTMLElement = HTMLElement>({
  enabled,
  disabled = false,
  onDelta,
}: WheelControlOptions) {
  const ref = useRef<T>(null);
  const onDeltaRef = useRef(onDelta);
  onDeltaRef.current = onDelta;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || disabled) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      const isShift = event.shiftKey;
      const delta = event.deltaY < 0 ? 1 : -1;
      onDeltaRef.current(delta, isShift);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, disabled]);

  return ref;
}
