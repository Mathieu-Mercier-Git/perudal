import React, { AnimationEvent, ReactNode, useState } from 'react';
import classNames from '../../../../lib/class-names/ClassNames';

// Sens du changement : 1 = la valeur monte (le contenu défile vers le bas), -1 = elle descend
export type RollDirection = 1 | -1;

type Slot<T> = {
  key: number,
  value: T,
};

type Rolling<T> = {
  current: Slot<T>,
  leaving?: Slot<T>,
  direction: RollDirection,
};

type Props<T> = {
  value: T,
  direction: RollDirection,
  render: (value: T) => ReactNode,
};

/**
 * Affiche une valeur qui « roule » comme une molette de cadenas quand elle change :
 * l'ancienne valeur sort d'un côté pendant que la nouvelle entre de l'autre.
 * Le sens est fourni par l'appelant (et non déduit des valeurs) pour gérer les valeurs
 * cycliques, ex. la face 6 qui passe à 1 en montant.
 */
export default function RollingValue<T>({ value, direction, render }: Props<T>) {
  const [rolling, setRolling] = useState<Rolling<T>>({ current: { key: 0, value }, direction });

  // État dérivé : on bascule pendant le rendu pour éviter une frame avec l'ancienne valeur
  if (rolling.current.value !== value) {
    setRolling({
      current: { key: rolling.current.key + 1, value },
      leaving: rolling.current,
      direction,
    });
  }

  const onLeavingEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    // Ignore les animations des éléments enfants (ex. le dé)
    if (event.target !== event.currentTarget) {
      return;
    }
    setRolling((previous: Rolling<T>) => ({ ...previous, leaving: undefined }));
  };

  const directionClass: string = rolling.direction === 1 ? 'online-roll--up' : 'online-roll--down';

  return (
    <span className={classNames('online-roll', directionClass)}>
      {rolling.leaving && (
        <span
          key={rolling.leaving.key}
          className="online-roll__item online-roll__item--leaving"
          aria-hidden
          onAnimationEnd={onLeavingEnd}
        >
          {render(rolling.leaving.value)}
        </span>
      )}
      <span
        key={rolling.current.key}
        className={classNames('online-roll__item', { 'online-roll__item--entering': rolling.current.key > 0 })}
      >
        {render(rolling.current.value)}
      </span>
    </span>
  );
}
