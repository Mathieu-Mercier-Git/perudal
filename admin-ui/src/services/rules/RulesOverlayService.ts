import { Observable, observable, WritableObservable } from 'micro-observables';

/**
 * Pilote l'affichage de la surcouche « Règles du jeu ».
 * Ce n'est pas une route : l'overlay se superpose au contexte courant (accueil, lobby, partie)
 * sans le démonter, ce qui permet de consulter les règles en pleine partie sans perdre son état.
 */
export default class RulesOverlayService {
  private isOpen: WritableObservable<boolean>;

  constructor() {
    this.isOpen = observable(false);
  }

  isRulesOpen(): Observable<boolean> {
    return this.isOpen.readOnly();
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
