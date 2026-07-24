import React, { useState } from 'react';
import Dice from './Dice';
import { Game, Player } from '../../../../services/game/GameTypes';

type Props = {
  game: Game;
};

type DiceCount = {
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
  six: number;
}

export default function DiceCounter({ game }: Props) {
  const players: Player[] = [...game.players];

  const makeDiceCount = (): DiceCount => {
    let one: number = 0;
    let two: number = 0;
    let three: number = 0;
    let four: number = 0;
    let five: number = 0;
    let six: number = 0;

    players.forEach((player: Player) => {
      player.dices.forEach((dice: number) => {
        if (dice === 1) one++;
        else if (dice === 2) two++;
        else if (dice === 3) three++;
        else if (dice === 4) four++;
        else if (dice === 5) five++;
        else if (dice === 6) six++;
      })
    })
    return { one, two, three, four, five, six };
  }

  const [diceCount, ] = useState<DiceCount>(makeDiceCount());

  return (
    <div className="dice-counter">
      <div>Résultat du tour</div>
      <div className="dice-counter-list">
        <div className="dice-counter-item">
          <Dice number={1} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.one}
          </div>
        </div>
        <div className="dice-counter-item">
          <Dice number={2} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.two}
          </div>
        </div>
        <div className="dice-counter-item">
          <Dice number={3} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.three}
          </div>
        </div>
        <div className="dice-counter-item">
          <Dice number={4} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.four}
          </div>
        </div>
        <div className="dice-counter-item">
          <Dice number={5} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.five}
          </div>
        </div>
        <div className="dice-counter-item">
          <Dice number={6} show />
          <div className="dice-count">
            <span>x</span>
            {diceCount.six}
          </div>
        </div>
      </div>
    </div>
  );
}
