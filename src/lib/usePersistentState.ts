"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const EVENT_NAME = "persistent-state-change";

function notify(key: string) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: key }));
}

/**
 * useState that persists its value to localStorage under the given key.
 *
 * Uses useSyncExternalStore so the server render (and hydration) uses
 * `initialValue` while the client reads any previously stored value after
 * hydration — avoiding hydration mismatches without calling setState in an
 * effect. Updates are written to localStorage and synced across tabs and
 * hook instances sharing the same key.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Keep the initial value stable across renders so the snapshot callbacks
  // (and thus the store subscription) don't change identity every render.
  const initialRef = useRef(initialValue);
  const cacheRef = useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: initialValue,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) onStoreChange();
      };
      const onCustom = (e: Event) => {
        if ((e as CustomEvent<string>).detail === key) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(EVENT_NAME, onCustom);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(EVENT_NAME, onCustom);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    const raw = window.localStorage.getItem(key);
    // Return a cached reference when the underlying string is unchanged so
    // useSyncExternalStore doesn't see a new object on every read.
    if (raw === cacheRef.current.raw) {
      return cacheRef.current.value;
    }
    let parsed: T;
    try {
      parsed = raw === null ? initialRef.current : (JSON.parse(raw) as T);
    } catch {
      parsed = initialRef.current;
    }
    cacheRef.current = { raw, value: parsed };
    return parsed;
  }, [key]);

  const getServerSnapshot = useCallback(() => initialRef.current, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (action) => {
      const prev = getSnapshot();
      const next =
        typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore write failures (e.g. storage full or unavailable).
      }
      notify(key);
    },
    [key, getSnapshot],
  );

  return [value, setValue];
}
