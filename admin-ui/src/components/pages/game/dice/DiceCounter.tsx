import React, { useMemo } from 'react';
import Dice from './Dice';
import { Game, Player } from '../../../../services/game/GameTypes';
import classNames from '../../../../lib/class-names/ClassNames';

type Props = {
  game: Game,
  isPlanificato?: boolean,
};

type FaceCount = {
  face: number,
  // Nombre de dés affichant réellement cette face
  count: number,
  // Perudos (toucans) qui viennent compléter une mise sur cette face
  bonus: number,
};

const FACES: number[] = [1, 2, 3, 4, 5, 6];

const toucanImage: string = '/assets/images/toucan.png';

export default function DiceCounter({ game, isPlanificato }: Props) {
  // Hors planificato, le perudo (toucan, face 1) est un joker : il compte dans
  // les mises sur 2, 3, 4, 5 et 6. On affiche donc le décompte brut de la face,
  // puis le renfort apporté par les perudos.
  const faceCounts: FaceCount[] = useMemo(
    () => {
      const counts: number[] = FACES.map(() => 0);
      game.players.forEach((player: Player) => {
        player.dices.forEach((dice: number) => {
          if (dice >= 1 && dice <= 6) {
            counts[dice - 1] += 1;
          }
        });
      });

      const toucanCount: number = counts[0];
      return FACES.map((face: number) => ({
        face,
        count: counts[face - 1],
        bonus: (isPlanificato || face === 1) ? 0 : toucanCount,
      }));
    },
    [game.players, isPlanificato],
  );

  const hasNoJoker: boolean = !isPlanificato && faceCounts[0].count === 0;

  return (
    <div className="dice-counter">
      <div className="dice-counter__title">Résultat du tour</div>
      <div className="dice-counter-list">
        {faceCounts.map(({ face, count, bonus }: FaceCount) => (
          <div
            key={face}
            className={classNames('dice-counter-item', {
              'dice-counter-item--joker': face === 1 && !isPlanificato,
            })}
            title={bonus > 0 ? `${count} + ${bonus} perudo${bonus > 1 ? 's' : ''} = ${count + bonus}` : undefined}
          >
            <Dice number={face} show isPlanificato={isPlanificato} />
            <div className="dice-count">
              <span>x</span>
              {count}
            </div>
            {bonus > 0 && (
              <span className="dice-counter-bonus">
                <span className="dice-counter-bonus__value">+{bonus}</span>
                <img src={toucanImage} alt="perudos" />
              </span>
            )}
          </div>
        ))}
      </div>
      {hasNoJoker && (
        <div className="dice-counter__legend">Aucun perudo sur la table</div>
      )}
    </div>
  );
}
