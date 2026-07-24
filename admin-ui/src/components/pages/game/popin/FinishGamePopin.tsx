import React from 'react';
import { Popin } from '../../../theme/popin/Popin';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton, ActionsContainer } from '../../../theme/action/Actions';

type Props = {
  onClick: () => void,
  playerName: string,
};

export default function FinishGamePopin({ onClick, playerName }: Props) {
  return (
    <Popin>
      <div className="popin-title">
        Partie terminée
      </div>
      <div className="popin-message">
        <span>Le grand vainqueur est </span>
        <span>{playerName}</span>
        <span> !!!</span>
      </div>
      <div className="popin-buttons">
        <ActionsContainer>
          <ActionButton
            style={ActionStyle.PRIMARY}
            onClick={onClick}
          >
            Retour à l'accueil
          </ActionButton>
        </ActionsContainer>
      </div>
    </Popin>
  );
}
