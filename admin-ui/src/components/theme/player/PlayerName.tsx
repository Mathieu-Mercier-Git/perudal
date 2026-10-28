import React from 'react';
import classNames from '../../../lib/class-names/ClassNames';
import { Player } from '../../../services/game/GameTypes';

type Props = {
  player: Player,
  className?: string,
};

// Pseudo précédé de l'emoji du joueur, posés sur la même ligne de base
export default function PlayerName({ player, className }: Props) {
  return (
    <span className={classNames('player-name', className)}>
      {player.emoji && (<span className="player-name__emoji">{player.emoji}</span>)}
      <span className="player-name__label">{player.name}</span>
    </span>
  );
}
