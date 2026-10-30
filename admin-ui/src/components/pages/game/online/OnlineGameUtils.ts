import { Bid, Game, Player } from '../../../../services/game/GameTypes';
import { BidContext } from '../../../../services/game/BidRules';

export type OrderedPlayer = {
  player: Player,
  // Position fixe dans l'ordre de jeu, de 1 à N
  position: number,
};

/** Joueurs dans l'ordre fixe tiré au sort au lancement (éliminés compris, partis exclus) */
export function orderedPlayers(game: Game): OrderedPlayer[] {
  return (game.playerOrder ?? [])
    .map((playerId: string, index: number) => ({
      player: game.players.find((player: Player) => player.id === playerId),
      position: index + 1,
    }))
    .filter((ordered: { player: Player | undefined, position: number }): ordered is OrderedPlayer => !!ordered.player);
}

export function positionOf(game: Game, playerId: string | undefined): number | undefined {
  const index: number = (game.playerOrder ?? []).indexOf(playerId ?? '');
  return index >= 0 ? index + 1 : undefined;
}

export function isAlive(player: Player): boolean {
  return player.diceNumber > 0;
}

/** Dernière mise du joueur dans la manche en cours */
export function lastBidOf(game: Game, playerId: string): Bid | undefined {
  return [...(game.roundBids ?? [])].reverse().find((bid: Bid) => bid.playerId === playerId);
}

/** Dés en jeu, ceux des joueurs partis pendant la manche compris (comme côté serveur) */
export function totalDiceInPlay(game: Game): number {
  return [...game.players, ...(game.departedPlayers ?? [])]
    .reduce((total: number, player: Player) => total + player.dices.length, 0);
}

export function findPlayer(game: Game, playerId: string | null | undefined): Player | undefined {
  return [...game.players, ...(game.departedPlayers ?? [])].find((player: Player) => player.id === playerId);
}

export function bidContextOf(game: Game): BidContext {
  return {
    previous: game.currentBid ?? undefined,
    planificato: game.isPlanificato,
    openingFace: game.roundBids?.[0]?.face,
    totalDice: totalDiceInPlay(game),
  };
}
