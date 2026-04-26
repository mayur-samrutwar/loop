'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const FLOW_STORAGE_KEY = 'loop.capture.flow';

const items = [
  {
    href: '/home',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
        <path
          d="M4.75 10.75 12 4.5l7.25 6.25v7.5a1.75 1.75 0 0 1-1.75 1.75h-3.25v-5.25h-4.5V20H6.5a1.75 1.75 0 0 1-1.75-1.75v-7.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
        <path
          d="M6.75 10.5a5.25 5.25 0 0 1 10.5 0v3.25l1.4 2.6a.75.75 0 0 1-.66 1.1H6.01a.75.75 0 0 1-.66-1.1l1.4-2.6V10.5Zm3 7.95a2.35 2.35 0 0 0 4.5 0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
        <path
          d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm7.25 7c-.82-3.08-3.6-5.25-7.25-5.25s-6.43 2.17-7.25 5.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  
];

export function BottomMenu() {
  const pathname = usePathname();
  const [hideOnHome, setHideOnHome] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHideOnHome(
        pathname === '/home' &&
          window.localStorage.getItem(FLOW_STORAGE_KEY) !== null,
      );
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('loop-flow-change', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('loop-flow-change', sync);
    };
  }, [pathname]);

  if (hideOnHome) return null;

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 flex justify-center px-6"
      aria-label="Primary navigation"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/85 p-2 shadow-[0_18px_45px_rgba(28,25,23,0.12)] backdrop-blur-xl">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={clsx(
                'flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95',
                active
                  ? 'bg-stone-100 text-stone-950 shadow-inner ring-1 ring-stone-200'
                  : 'text-stone-400 hover:text-stone-700',
              )}
            >
              {item.icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
