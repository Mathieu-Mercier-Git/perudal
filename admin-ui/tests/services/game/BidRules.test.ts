import {
  BidContext,
  cycleFace,
  InvalidBidReason,
  invalidReason,
  isValidBid,
  minimalValidBid,
} from '../../../src/services/game/BidRules';

const TOTAL_DICE: number = 25;

const opening = (planificato: boolean = false): BidContext => ({ planificato, totalDice: TOTAL_DICE });

const after = (quantity: number, face: number, planificato: boolean = false): BidContext => ({
  previous: { quantity, face },
  planificato,
  openingFace: planificato ? face : undefined,
  totalDice: TOTAL_DICE,
});

describe('BidRules.cycleFace', () => {
  it('passe à la face voisine', () => {
    expect(cycleFace(3, 1)).toBe(4);
    expect(cycleFace(3, -1)).toBe(2);
  });

  it('revient au perudo après le 6', () => {
    expect(cycleFace(6, 1)).toBe(1);
  });

  it('revient au 6 avant le perudo', () => {
    expect(cycleFace(1, -1)).toBe(6);
  });
});

describe('BidRules.isValidBid', () => {
  describe('ouverture', () => {
    test('une face classique est acceptée', () => {
      expect(isValidBid({ quantity: 1, face: 2 }, opening())).toBe(true);
      expect(isValidBid({ quantity: 3, face: 6 }, opening())).toBe(true);
    });

    test('on ne peut pas ouvrir en perudos en manche normale', () => {
      expect(invalidReason({ quantity: 2, face: 1 }, opening()))
        .toEqual({ reason: InvalidBidReason.OPENING_PERUDO });
    });

    test('en planificato, on peut ouvrir en perudos', () => {
      expect(isValidBid({ quantity: 1, face: 1 }, opening(true))).toBe(true);
    });
  });

  describe('bornes', () => {
    test('la quantité va de 1 au nombre de dés en jeu', () => {
      expect(isValidBid({ quantity: 0, face: 3 }, opening())).toBe(false);
      expect(isValidBid({ quantity: TOTAL_DICE, face: 3 }, opening())).toBe(true);
      expect(invalidReason({ quantity: TOTAL_DICE + 1, face: 3 }, opening()))
        .toEqual({ reason: InvalidBidReason.OUT_OF_RANGE });
    });

    test('la face va de 1 à 6', () => {
      expect(isValidBid({ quantity: 2, face: 0 }, after(1, 2))).toBe(false);
      expect(isValidBid({ quantity: 2, face: 7 }, after(1, 2))).toBe(false);
    });
  });

  describe('classique après classique', () => {
    test('plus de dés, n\'importe quelle face', () => {
      expect(isValidBid({ quantity: 5, face: 2 }, after(4, 5))).toBe(true);
    });

    test('même nombre, face plus haute', () => {
      expect(isValidBid({ quantity: 4, face: 6 }, after(4, 5))).toBe(true);
    });

    test('même nombre, face égale ou plus basse : refusée', () => {
      expect(invalidReason({ quantity: 4, face: 4 }, after(4, 5)))
        .toEqual({ reason: InvalidBidReason.CLASSIC_TOO_LOW });
      expect(isValidBid({ quantity: 4, face: 5 }, after(4, 5))).toBe(false);
      expect(isValidBid({ quantity: 3, face: 6 }, after(4, 5))).toBe(false);
    });
  });

  describe('perudo après classique', () => {
    test('au moins la moitié arrondie au-dessus', () => {
      expect(isValidBid({ quantity: 2, face: 1 }, after(4, 5))).toBe(true);
      expect(invalidReason({ quantity: 1, face: 1 }, after(4, 5)))
        .toEqual({ reason: InvalidBidReason.TO_PERUDO_TOO_LOW, minimumQuantity: 2 });
    });

    test('arrondi au-dessus sur une quantité impaire', () => {
      expect(isValidBid({ quantity: 3, face: 1 }, after(5, 3))).toBe(true);
      expect(invalidReason({ quantity: 2, face: 1 }, after(5, 3)))
        .toEqual({ reason: InvalidBidReason.TO_PERUDO_TOO_LOW, minimumQuantity: 3 });
    });
  });

  describe('perudo après perudo', () => {
    test('il faut plus de perudos', () => {
      expect(isValidBid({ quantity: 5, face: 1 }, after(4, 1))).toBe(true);
      expect(invalidReason({ quantity: 4, face: 1 }, after(4, 1)))
        .toEqual({ reason: InvalidBidReason.PERUDO_TOO_LOW });
    });
  });

  describe('classique après perudo', () => {
    test('au moins le double plus un, n\'importe quelle face', () => {
      expect(isValidBid({ quantity: 9, face: 3 }, after(4, 1))).toBe(true);
      expect(isValidBid({ quantity: 9, face: 2 }, after(4, 1))).toBe(true);
      expect(invalidReason({ quantity: 8, face: 6 }, after(4, 1)))
        .toEqual({ reason: InvalidBidReason.FROM_PERUDO_TOO_LOW, minimumQuantity: 9 });
    });
  });

  describe('planificato', () => {
    test('la face est verrouillée sur celle de l\'ouverture, seul le nombre monte', () => {
      expect(isValidBid({ quantity: 5, face: 4 }, after(4, 4, true))).toBe(true);
      expect(invalidReason({ quantity: 5, face: 5 }, after(4, 4, true)))
        .toEqual({ reason: InvalidBidReason.PLANIFICATO_LOCKED_FACE, lockedFace: 4 });
      expect(isValidBid({ quantity: 4, face: 4 }, after(4, 4, true))).toBe(false);
    });

    test('la face d\'ouverture prime sur celle de la mise à battre', () => {
      const context: BidContext = {
        previous: { quantity: 2, face: 3 }, planificato: true, openingFace: 1, totalDice: TOTAL_DICE,
      };
      expect(isValidBid({ quantity: 3, face: 1 }, context)).toBe(true);
      expect(isValidBid({ quantity: 3, face: 3 }, context)).toBe(false);
    });

    test('les perudos ne passent pas en classique', () => {
      expect(isValidBid({ quantity: 9, face: 3 }, after(4, 1, true))).toBe(false);
    });
  });
});

describe('BidRules.minimalValidBid', () => {
  test('ouverture : 1 × 2', () => {
    expect(minimalValidBid(opening())).toEqual({ quantity: 1, face: 2 });
    expect(minimalValidBid(opening(true))).toEqual({ quantity: 1, face: 2 });
  });

  test('après une mise classique : face suivante', () => {
    expect(minimalValidBid(after(4, 5))).toEqual({ quantity: 4, face: 6 });
  });

  test('après une mise sur le 6 : un dé de plus sur le 2', () => {
    expect(minimalValidBid(after(4, 6))).toEqual({ quantity: 5, face: 2 });
  });

  test('après des perudos : un perudo de plus', () => {
    expect(minimalValidBid(after(4, 1))).toEqual({ quantity: 5, face: 1 });
  });

  test('en planificato : un dé de plus sur la face verrouillée', () => {
    expect(minimalValidBid(after(3, 6, true))).toEqual({ quantity: 4, face: 6 });
  });

  test('la mise pré-remplie est toujours valide quand elle tient dans les dés en jeu', () => {
    [after(4, 5), after(4, 6), after(4, 1), after(3, 6, true), opening(), opening(true)]
      .forEach((context: BidContext) => expect(isValidBid(minimalValidBid(context), context)).toBe(true));
  });
});
