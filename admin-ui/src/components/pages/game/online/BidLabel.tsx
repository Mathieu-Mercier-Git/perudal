import React from 'react';
import classNames from '../../../../lib/class-names/ClassNames';
import Dice, { DiceSize } from '../dice/Dice';

type Props = {
  quantity: number,
  face: number,
  isPlanificato?: boolean,
  diceSize?: DiceSize,
  className?: string,
};

// Mise affichée « 4 × [dé] »
export default function BidLabel({
  quantity, face, isPlanificato, diceSize = 'xs', className,
}: Props) {
  return (
    <span className={classNames('bid-label', `bid-label--${diceSize}`, className)}>
      <span className="bid-label__quantity">{quantity} ×</span>
      <Dice number={face} show isPlanificato={isPlanificato} size={diceSize} />
    </span>
  );
}
