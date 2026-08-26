'use client';

import { useSyncExternalStore } from 'react';
import { toLocalDateKey } from './local-date';

const subscribe = () => () => undefined;

export function useLocalToday(serverDateKey: string): string {
  return useSyncExternalStore(
    subscribe,
    () => toLocalDateKey(new Date()),
    () => serverDateKey,
  );
}
