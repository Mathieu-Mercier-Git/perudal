import { Observable, observable, WritableObservable } from 'micro-observables';

/** Ancre de la section « Chiffre exact » dans les règles */
export const RULES_SECTION_EXACT: string = 'rules-chiffre-exact';

/** Ancre de la section « Planificato » dans les règles */
export const RULES_SECTION_PLANIFICATO: string = 'rules-planificato';

/**
 * Pilote l'affichage de la surcouche « Règles du jeu ».
 * Ce n'est pas une route : l'overlay se superpose au contexte courant (accueil, lobby, partie)
 * sans le démonter, ce qui permet de consulter les règles en pleine partie sans perdre son état.
 */
export default class RulesOverlayService {
  private isOpen: WritableObservable<boolean>;

  // Section sur laquelle ouvrir les règles, absente pour les ouvrir en haut
  private targetSection: WritableObservable<string | undefined>;

  constructor() {
    this.isOpen = observable(false);
    this.targetSection = observable<string | undefined>(undefined);
  }

  getTargetSection(): Observable<string | undefined> {
    return this.targetSection.readOnly();
  }

  isRulesOpen(): Observable<boolean> {
    return this.isOpen.readOnly();
  }

  open(section?: string): void {
    this.targetSection.set(section);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
