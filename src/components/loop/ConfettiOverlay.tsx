'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Confetti, type ConfettiRef } from '@/components/ui/confetti';

export type ConfettiOverlayHandle = {
  fire: () => void;
};

export const ConfettiOverlay = forwardRef<ConfettiOverlayHandle>(
  function ConfettiOverlay(_props, ref) {
    const innerRef = useRef<ConfettiRef>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
      const update = () =>
        setSize({ w: window.innerWidth, h: window.innerHeight });
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        fire: () => {
          requestAnimationFrame(() => {
            innerRef.current?.fire({
              particleCount: 220,
              spread: 90,
              startVelocity: 48,
              ticks: 220,
              origin: { x: 0.5, y: 0.55 },
              scalar: 1.05,
            });
          });
        },
      }),
      [],
    );

    if (size.w === 0 || size.h === 0) return null;

    return (
      <Confetti
        ref={innerRef}
        manualstart
        width={size.w}
        height={size.h}
        className="pointer-events-none fixed inset-0 z-50"
      />
    );
  },
);
