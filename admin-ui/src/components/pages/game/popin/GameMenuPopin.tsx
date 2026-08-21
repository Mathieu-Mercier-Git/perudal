import React from 'react';
import { Popin } from '../../../theme/popin/Popin';
import { ActionButton, ActionsContainer } from '../../../theme/action/Actions';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';

type Props = {
  isAdmin: boolean,
  onShowRules: () => void,
  onLeaveGame: () => void,
  onRollDices: () => void,
  onClose: () => void,
};

export default function GameMenuPopin({
  isAdmin, onShowRules, onLeaveGame, onClose, onRollDices
}: Props) {
  return (
    <Popin zIndex={110}>
      <div className="popin-title">Menu</div>
      <div className="popin-content game-menu">
        <ActionButton style={ActionStyle.PRIMARY} icon="menu_book" onClick={onShowRules}>
          Règles du jeu
        </ActionButton>
        {isAdmin && (
          <ActionButton style={ActionStyle.PRIMARY} icon="replay" onClick={onRollDices}>
            Relancer les dés
          </ActionButton>
        )}
        <ActionButton
          style={ActionStyle.PRIMARY}
          icon={isAdmin ? 'cancel' : 'logout'}
          onClick={onLeaveGame}
        >
          {isAdmin ? 'Annuler la partie' : 'Quitter la partie'}
        </ActionButton>
      </div>
      <div className="popin-buttons">
        <ActionsContainer>
          <ActionButton style={ActionStyle.DANGER} onClick={onClose}>
            Fermer
          </ActionButton>
        </ActionsContainer>
      </div>
    </Popin>
  );
}
