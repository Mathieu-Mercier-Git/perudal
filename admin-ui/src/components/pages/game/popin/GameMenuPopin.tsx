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
  // Mode en ligne : l'admin ne peut pas court-circuiter la manche
  canRollDices?: boolean,
  // Mode en ligne : son joué quand c'est au joueur de jouer
  isSoundEnabled?: boolean,
  onToggleSound?: () => void,
};

export default function GameMenuPopin({
  isAdmin, onShowRules, onLeaveGame, onClose, onRollDices, canRollDices = true, isSoundEnabled, onToggleSound,
}: Props) {
  return (
    <Popin zIndex={110}>
      <div className="popin-title">Menu</div>
      <div className="popin-content game-menu">
        <ActionButton style={ActionStyle.PRIMARY} icon="menu_book" onClick={onShowRules}>
          Règles du jeu
        </ActionButton>
        {onToggleSound && (
          <ActionButton
            style={ActionStyle.PRIMARY}
            icon={isSoundEnabled ? 'volume_off' : 'volume_up'}
            onClick={onToggleSound}
          >
            {isSoundEnabled ? 'Couper le son' : 'Activer le son'}
          </ActionButton>
        )}
        {isAdmin && canRollDices && (
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
