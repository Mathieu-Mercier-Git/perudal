import React, { useRef, useState } from 'react';
import { useOnComponentUnMounted } from '../../../../lib/react-hooks-alias/ReactHooksAlias';

type Timeout = ReturnType<typeof setTimeout>;

export type CancellableCountdown<T> = {
  // Action en attente pendant le compte à rebours
  pending: T | undefined,
  // Démarre le compte à rebours, ou l'annule si l'action est déjà en attente
  toggle: (action: T) => void,
  cancel: () => void,
};

/**
 * Même principe que « Révéler tous les dés » en mode local : l'action ne part qu'au bout
 * d'un délai pendant lequel le joueur peut l'annuler, pour éviter un clic non voulu.
 */
export default function useCancellableCountdown<T>(
  delayInMillis: number,
  onElapsed: (action: T) => void,
): CancellableCountdown<T> {
  const [pending, setPending] = useState<T | undefined>(undefined);
  const timeoutRef: React.MutableRefObject<Timeout | undefined> = useRef<Timeout | undefined>(undefined);

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setPending(undefined);
  };

  const toggle = (action: T) => {
    if (pending !== undefined) {
      cancel();
      return;
    }
    setPending(action);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      setPending(undefined);
      onElapsed(action);
    }, delayInMillis);
  };

  useOnComponentUnMounted(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  });

  return { pending, toggle, cancel };
}
