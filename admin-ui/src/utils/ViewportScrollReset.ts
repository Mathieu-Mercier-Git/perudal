// Sur iOS (Safari et PWA), quand on touche un champ de saisie, le navigateur fait défiler
// toute la page vers le haut pour laisser la place au clavier, même si la page n'est pas scrollable.
// Quand le clavier se ferme (perte du focus, ou popin fermée / écran changé pendant la saisie),
// iOS ne remet pas ce défilement à zéro : l'écran reste décalé vers le haut et devient scrollable.
// On remet donc la page à sa position d'origine dès qu'aucun champ n'a plus le focus.

const isEditableElement = (element: Element | null): boolean => {
  if (!element) {
    return false;
  }
  const { tagName } = element;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
    || (element as HTMLElement).isContentEditable;
};

const resetScrollIfKeyboardClosed = () => {
  if (isEditableElement(document.activeElement)) {
    // Clavier encore ouvert : on laisse iOS gérer le défilement pendant la saisie
    return;
  }
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
};

export default function installViewportScrollReset() {
  // Le focus passe d'un champ à l'autre : on attend que le nouveau focus soit posé avant de vérifier
  document.addEventListener('focusout', () => {
    setTimeout(resetScrollIfKeyboardClosed, 50);
  });

  // Le clavier se ferme sans évènement de focus (ex. champ retiré du DOM à la fermeture de la popin) :
  // la zone visible reprend alors sa taille, ce qui déclenche un resize du visualViewport
  window.visualViewport?.addEventListener('resize', resetScrollIfKeyboardClosed);
}
