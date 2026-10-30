import React from 'react';
import classNames from '../../../../lib/class-names/ClassNames';

const toucanImage = '/assets/images/toucan.png';

// Tailles du mode en ligne ; sans taille, le dé garde son rendu d'origine (50px)
export type DiceSize = 'xs' | 'sm' | 'xl';

type Props = {
  number: number,
  isPlanificato?: boolean,
  show?: boolean,
  size?: DiceSize,
  className?: string,
};

export default function Dice({
  number, show, isPlanificato, size, className,
}: Props) {
  const dots: number[] = Array.from({ length: number }, (_, i) => i + 1);
  // TODO : gérer aussi le style du perudo
  const isToucan: boolean = number === 1 && !isPlanificato;

  return (
    <div
      className={classNames(
        'dice',
        isToucan ? 'dice--toucan' : `dice--${number}`,
        { 'dice--hidden': !show },
        size && `dice--${size}`,
        className,
      )}
    >
      {isToucan
        ? <img src={toucanImage} alt="toucan" />
        : dots.map((dot) => (<span key={dot} className="dice-dot" />))}
    </div>
  );
}
