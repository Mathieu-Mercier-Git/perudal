import React from 'react';

type Props = {
  number: number,
  show?: boolean,
};

export default function Dice({ number, show }: Props) {
  const dots: number[] = Array.from({ length: number }, (_, i) => i + 1);
  // TODO : gérer aussi le style du perudo

  if (!show) {
    return (<div className="dice"/>);
  }

  return (
    <div className={`dice dice--${number}`}>
      {dots.map((dot) => (
        <span key={dot} className="dice-dot" />
      ))}
    </div>
  );
}
