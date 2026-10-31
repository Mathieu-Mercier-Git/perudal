import { MutableRefObject, useEffect, useRef } from 'react';

const BACK_GUARD_STATE_KEY: string = 'backGuard';

/**
 * Ajoute à l'historique une entrée de même URL que la page courante.
 * Conserver l'état existant laisse le routeur voir la même location : l'écran n'est pas remonté.
 */
function pushBackGuard(): void {
  window.history.pushState({ ...window.history.state, [BACK_GUARD_STATE_KEY]: true }, '');
}

/**
 * Intercepte le bouton Précédent du navigateur : la page reste affichée et `onBack` est appelée.
 * Un seul composant monté à la fois doit activer ce hook.
 *
 * Les navigateurs peuvent ignorer l'entrée ajoutée tant que l'utilisateur n'a pas interagi
 * avec la page : Précédent peut alors quitter la page, l'interception n'est donc pas garantie.
 * @param onBack La fonction appelée à chaque appui sur Précédent
 * @param isEnabled Permet de ne pas intercepter tant que l'écran n'est pas réellement affiché
 */
export default function useBackButtonHandler(onBack: () => void, isEnabled: boolean = true): void {
  const onBackRef: MutableRefObject<() => void> = useRef<() => void>(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }
    // Déjà présente après un rechargement de page : on évite d'empiler les entrées
    if (!window.history.state?.[BACK_GUARD_STATE_KEY]) {
      pushBackGuard();
    }

    const onPopState = () => {
      pushBackGuard();
      onBackRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isEnabled]);
}
