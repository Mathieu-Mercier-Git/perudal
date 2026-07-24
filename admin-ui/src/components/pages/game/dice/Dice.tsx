import React from 'react';

const toucanImage = '/assets/images/toucan.png';

type Props = {
  number: number,
  show?: boolean,
  isPlanificato?: boolean,
};

export default function Dice({ number, show, isPlanificato }: Props) {
  const dots: number[] = Array.from({ length: number }, (_, i) => i + 1);
  // TODO : gérer aussi le style du perudo

  if (!show) {
    return (<div className="dice"/>);
  }

  if (number === 1 && !isPlanificato) {
    return (
      <div className="dice dice--toucan">
        <img src={toucanImage} alt="toucan" />
      </div>
    );
  }

  return (
    <div className={`dice dice--${number}`}>
      {dots.map((dot) => (
        <span key={dot} className="dice-dot" />
      ))}
    </div>
  );
}
