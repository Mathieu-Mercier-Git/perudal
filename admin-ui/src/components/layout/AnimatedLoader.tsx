import React from 'react';

type AnimatedLoaderProps = {
  customMessage?: string;
  className?: string;
  small?: boolean;
};

export default function AnimatedLoader({ customMessage, className, small }: AnimatedLoaderProps) {
  return (
    <div className={`loader ${className || ''} ${small ? 'small-size' : ''}`}>
      <div className="lds-ring">
        <div />
        <div />
        <div />
        <div />
      </div>
      {customMessage && (
        <div className="custom-message">
          {customMessage}
        </div>
      )}
    </div>
  );
}
