import React from 'react';
import { Player } from '../../../../services/game/GameTypes';
import { Popin } from '../../../theme/popin/Popin';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton, ActionsContainer } from '../../../theme/action/Actions';
import useToggle from '../../../../lib/react-hook-toggle/ReactHookToggle';

type Props = {
  onClick: (playerId: string, hasLostTurn: boolean) => void,
  onClose: () => void,
  players: Player[],
};

// TODO : Inspiré du code de ValidationPopin

export default function FinishTurnPopin({ onClose, onClick, players }: Props) {
  const [hasLostTurn, toggleHasLostTurn] = useToggle(true);

  return (
    <Popin>
      <div className={`popin-title ${hasLostTurn ? '' : 'win'}`}>
        {hasLostTurn ? 'Qui a perdu ce tour ?' : 'Qui a trouvé le chiffre exact ?'}
      </div>
      <div className="popin-content popin-content--tiles">
        {players.filter(player => player.diceNumber > 0).map(player => (
          <div key={player.id} className="player-tile" onClick={() => onClick(player.id, hasLostTurn)}>
            {player.name}
          </div>
        ))}
      </div>
      <div className="popin-buttons">
        <ActionsContainer>
          <ActionButton
            style={ActionStyle.SECONDARY}
            onClick={onClose}
          >
            Fermer
          </ActionButton>
          <ActionButton
            style={hasLostTurn ? ActionStyle.PRIMARY : ActionStyle.DANGER}
            onClick={toggleHasLostTurn}
          >
            {hasLostTurn
              ? 'Mode : Chiffre exact'
              : 'Mode : Défaite classique'
            }
          </ActionButton>
        </ActionsContainer>
      </div>
    </Popin>
  );
}
