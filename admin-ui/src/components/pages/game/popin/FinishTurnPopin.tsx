import React, { useRef, useState } from 'react';
import { Player } from '../../../../services/game/GameTypes';
import { Popin } from '../../../theme/popin/Popin';
import ActionStyle from '../../../../lib/plume-admin-theme/action/ActionStyle';
import { ActionButton, ActionsContainer } from '../../../theme/action/Actions';
import useToggle from '../../../../lib/react-hook-toggle/ReactHookToggle';
import { useOnComponentUnMounted } from '../../../../lib/react-hooks-alias/ReactHooksAlias';
import classNames from '../../../../lib/class-names/ClassNames';

type Props = {
  onClick: (playerId: string, hasLostTurn: boolean) => void,
  onClose: () => void,
  players: Player[],
};

// Délai (ms) pendant lequel le choix du joueur peut être annulé avant que la fin du tour ne parte
const FINISH_TURN_COUNTDOWN_MS: number = 2000;

export default function FinishTurnPopin({ onClose, onClick, players }: Props) {
  const [hasLostTurn, toggleHasLostTurn] = useToggle(true);
  // Choix différé : le joueur sélectionné est mis en attente pendant un compte à
  // rebours annulable, pour rattraper un clic sur le mauvais joueur
  const [pendingPlayerId, setPendingPlayerId] = useState<string | undefined>(undefined);

  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelCountdown = () => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = undefined;
    }
    setPendingPlayerId(undefined);
  };

  const onSelectPlayer = (player: Player) => {
    if (pendingPlayerId) { // un choix est déjà en cours : il faut l'annuler avant d'en faire un autre
      return;
    }
    setPendingPlayerId(player.id);
    countdownTimeoutRef.current = setTimeout(() => {
      countdownTimeoutRef.current = undefined;
      onClick(player.id, hasLostTurn);
    }, FINISH_TURN_COUNTDOWN_MS);
  };

  // Fermeture pendant le compte à rebours : l'action ne doit pas partir quand même
  useOnComponentUnMounted(() => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
    }
  });

  return (
    <Popin className={hasLostTurn ? '' : 'popin--exact'}>
      <div className={`popin-title ${hasLostTurn ? '' : 'win'}`}>
        {hasLostTurn ? 'Qui a perdu ce tour ?' : 'Qui a trouvé le chiffre exact ?'}
      </div>
      <div className="popin-content popin-content--tiles">
        {players.filter(player => player.diceNumber > 0).map(player => (
          <div
            key={player.id}
            className={classNames('player-tile', { 'player-tile--pending': player.id === pendingPlayerId })}
            onClick={() => onSelectPlayer(player)}
          >
            {player.id === pendingPlayerId && (
              <span
                className="player-tile__progress"
                style={{ animationDuration: `${FINISH_TURN_COUNTDOWN_MS}ms` }}
              />
            )}
            <span className="player-tile__name">{player.name}</span>
            <span className="player-tile__dices">
              {player.diceNumber} {player.diceNumber > 1 ? 'dés' : 'dé'}
            </span>
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
          {pendingPlayerId
            ? (
              <ActionButton
                style={ActionStyle.DANGER}
                onClick={cancelCountdown}
              >
                Annuler
              </ActionButton>
            )
            : (
              <ActionButton
                style={hasLostTurn ? ActionStyle.PRIMARY : ActionStyle.DANGER}
                onClick={toggleHasLostTurn}
              >
                {hasLostTurn ? 'Chiffre exact' : 'Défaite'}
              </ActionButton>
            )}
        </ActionsContainer>
      </div>
    </Popin>
  );
}
