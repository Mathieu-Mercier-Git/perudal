/**
 * Règles de mise du mode en ligne, miroir de `BidRules.java`.
 * Le serveur fait foi : ces règles servent uniquement à guider le joueur
 * (pré-remplissage, message d'erreur, bouton désactivé) avant l'appel.
 */

export const PERUDO: number = 1;
const MIN_FACE: number = 1;
const MAX_FACE: number = 6;
const MIN_CLASSIC_FACE: number = 2;

export type BidValue = {
  quantity: number,
  face: number,
};

export type BidContext = {
  // Mise à battre, absente à l'ouverture de la manche
  previous?: BidValue,
  planificato: boolean,
  // Face de la mise d'ouverture : verrouillée en planificato
  openingFace?: number,
  // Nombre total de dés en jeu
  totalDice: number,
};

export enum InvalidBidReason {
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  OPENING_PERUDO = 'OPENING_PERUDO',
  PLANIFICATO_LOCKED_FACE = 'PLANIFICATO_LOCKED_FACE',
  CLASSIC_TOO_LOW = 'CLASSIC_TOO_LOW',
  TO_PERUDO_TOO_LOW = 'TO_PERUDO_TOO_LOW',
  FROM_PERUDO_TOO_LOW = 'FROM_PERUDO_TOO_LOW',
  PERUDO_TOO_LOW = 'PERUDO_TOO_LOW',
}

export type InvalidBid = {
  reason: InvalidBidReason,
  // Quantité minimale à atteindre (perudo après classique, classique après perudo)
  minimumQuantity?: number,
  // Face verrouillée en planificato
  lockedFace?: number,
};

export const isPerudo = (face: number): boolean => face === PERUDO;

/** Face voisine sur la molette, qui boucle : après le 6 revient le 1 (perudo), et inversement */
export function cycleFace(face: number, delta: number): number {
  const faceCount: number = MAX_FACE - MIN_FACE + 1;
  return ((face - MIN_FACE + delta + faceCount) % faceCount) + MIN_FACE;
}

const ceilHalf = (quantity: number): number => Math.ceil(quantity / 2);

const lockedFaceOf = (context: BidContext): number | undefined => (
  context.openingFace ?? context.previous?.face
);

/** Raison pour laquelle la mise est refusée, ou `undefined` si elle est valide */
export function invalidReason(next: BidValue, context: BidContext): InvalidBid | undefined {
  const { quantity, face } = next;
  if (quantity < 1 || quantity > context.totalDice || face < MIN_FACE || face > MAX_FACE) {
    return { reason: InvalidBidReason.OUT_OF_RANGE };
  }

  const { previous } = context;
  if (!previous) { // ouverture : pas de perudos, sauf en planificato
    return context.planificato || !isPerudo(face) ? undefined : { reason: InvalidBidReason.OPENING_PERUDO };
  }

  if (context.planificato) {
    const lockedFace: number | undefined = lockedFaceOf(context);
    return face === lockedFace && quantity > previous.quantity
      ? undefined
      : { reason: InvalidBidReason.PLANIFICATO_LOCKED_FACE, lockedFace };
  }

  const previousIsPerudo: boolean = isPerudo(previous.face);
  const nextIsPerudo: boolean = isPerudo(face);
  if (!previousIsPerudo && !nextIsPerudo) {
    return quantity > previous.quantity || (quantity === previous.quantity && face > previous.face)
      ? undefined
      : { reason: InvalidBidReason.CLASSIC_TOO_LOW };
  }
  if (!previousIsPerudo) { // classique -> perudo : au moins la moitié arrondie au-dessus
    const minimumQuantity: number = ceilHalf(previous.quantity);
    return quantity >= minimumQuantity
      ? undefined
      : { reason: InvalidBidReason.TO_PERUDO_TOO_LOW, minimumQuantity };
  }
  if (nextIsPerudo) { // perudo -> perudo
    return quantity > previous.quantity ? undefined : { reason: InvalidBidReason.PERUDO_TOO_LOW };
  }
  const minimumQuantity: number = 2 * previous.quantity + 1; // perudo -> classique
  return quantity >= minimumQuantity
    ? undefined
    : { reason: InvalidBidReason.FROM_PERUDO_TOO_LOW, minimumQuantity };
}

export function isValidBid(next: BidValue, context: BidContext): boolean {
  return invalidReason(next, context) === undefined;
}

/**
 * Plus petite mise valide, utilisée pour pré-remplir la sélection.
 * Elle peut dépasser le nombre de dés en jeu : il n'y a alors plus de mise possible.
 */
export function minimalValidBid(context: BidContext): BidValue {
  const { previous } = context;
  if (!previous) {
    return { quantity: 1, face: MIN_CLASSIC_FACE };
  }
  if (context.planificato) {
    return { quantity: previous.quantity + 1, face: lockedFaceOf(context) ?? previous.face };
  }
  if (isPerudo(previous.face)) {
    return { quantity: previous.quantity + 1, face: PERUDO };
  }
  if (previous.face < MAX_FACE) {
    return { quantity: previous.quantity, face: previous.face + 1 };
  }
  return { quantity: previous.quantity + 1, face: MIN_CLASSIC_FACE };
}

// En dessous de ce nombre de joueurs encore en jeu, le chiffre exact n'est plus autorisé
const MIN_ALIVE_PLAYERS_FOR_EXACT: number = 3;

/**
 * Le « chiffre exact » n'est pas autorisé en manche planificato,
 * ni quand il ne reste que deux joueurs en jeu (miroir de `BidRules.isExactAllowed`).
 */
export function isExactAllowed(planificato: boolean, players: { diceNumber: number }[]): boolean {
  const alivePlayers: number = players.filter((player: { diceNumber: number }) => player.diceNumber > 0).length;
  return !planificato && alivePlayers >= MIN_ALIVE_PLAYERS_FOR_EXACT;
}
