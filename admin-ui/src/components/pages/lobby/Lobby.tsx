import React, { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { useObservable } from 'micro-observables';
import { Icon } from '@mui/material';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import { GAME, HOME } from '../../Routes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import GameService from '../../../services/game/GameService';
import { Game, LobbyType } from '../../../services/game/GameTypes';
import {
  addOnMessage,
  getIdSocket,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';

const DICE_NUMBER: number = 5;
const MIN_DICE_NUMBER: number = 1;
const MAX_DICE_NUMBER: number = 9;

export default function Lobby() {
  const gameService = getGlobalInstance(GameService);
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());

  const [diceNumber, setDiceNumber] = useState<number>(DICE_NUMBER);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCodeCopied, setIsCodeCopied] = useState<boolean>(false);

  const { messages } = useMessages();
  const navigate = useNavigate();

  useOnComponentMounted(() => {
    if (lobby) {
      setIsAdmin(!!lobby.players.find(player => player.id === getIdSocket() && player.isAdmin));
    }
  });

  const listenerUpdateLobby = useCallback(
    socketListener(ServerEvent.UPDATED_LOBBY, (response: LobbyType) => {
      gameService.setLobby(response);
      // TODO : stocker dans un localStorage
    }), [],
  );

  const listenerCancelGame = useCallback( // TODO : ajouter une popin pour confirmer qu'on veut annuler la partie
    socketListener(ServerEvent.CANCEL_GAME, () => {
      navigate(HOME); // TODO : rediriger avec vers HOME avec une popup d'information pour dire que la partie a été annulée
    }), [],
  );

  const listenerStartGame = useCallback(
    socketListener(ServerEvent.START_GAME, (response: Game) => {
      gameService.setGame(response);
      navigate(GAME);
    }), [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerUpdateLobby);
    addOnMessage(listenerCancelGame);
    addOnMessage(listenerStartGame);

    return () => {
      removeOnMessage(listenerUpdateLobby);
      removeOnMessage(listenerCancelGame);
      removeOnMessage(listenerStartGame);
    };
  });

  const startGame = () => {
    // TODO : ajouter des conditions + une popin de confirmation
    // TODO : idée, chargement sur le bouton de 5sec avec possibilités d'annuler pendant ce laps de temps
    gameService.startGame(lobby!.gameCode, diceNumber);
  };

  const removeDice = (): void => {
    if (diceNumber > MIN_DICE_NUMBER) {
      setDiceNumber(diceNumber - 1);
    }
  };

  const addDice = (): void => {
    if (diceNumber < MAX_DICE_NUMBER) {
      setDiceNumber(diceNumber + 1);
    }
  };

  const copyCode = (): void => {
    navigator.clipboard?.writeText(lobby!.gameCode)
      .then(() => {
        setIsCodeCopied(true);
        setTimeout(() => setIsCodeCopied(false), 1500);
      });
  };

  if (!lobby) {
    return (<Navigate to={HOME} />);
  }

  return (
    <Panel>
      <div className="lobby">
        <h1 className="lobby__title">{messages.lobby.title}</h1>

        <div className="lobby__code">
          <span className="lobby__code-label">Pérucode</span>
          <span className="lobby__code-value">{lobby.gameCode}</span>
          <button type="button" className="lobby__code-copy" onClick={copyCode}>
            <Icon>{isCodeCopied ? 'check' : 'content_copy'}</Icon>
          </button>
        </div>

        {isAdmin && (
          <div className="lobby__dice">
            <span className="lobby__dice-label">{messages.lobby.dice_number}</span>
            <div className="lobby__dice-stepper">
              <ActionButton cssClasses="action-container--icon" onClick={removeDice} icon="remove" />
              <span className="lobby__dice-value">{diceNumber}</span>
              <ActionButton cssClasses="action-container--icon" onClick={addDice} icon="add" />
            </div>
          </div>
        )}

        <div className="lobby__players">
          <div className="lobby__players-title">{messages.lobby.player_list}</div>
          <div className="lobby__players-grid">
            {React.Children.toArray(lobby.players.map((player) => (
              <div className="lobby__player">
                <span className="lobby__player-avatar">{player.name.charAt(0).toUpperCase()}</span>
                <span className="lobby__player-name">{player.name}</span>
                {player.isAdmin && (<Icon className="lobby__player-crown">star</Icon>)}
              </div>
            )))}
          </div>
        </div>

        <div className="lobby__actions">
          {isAdmin && (
            <ActionButton style={ActionStyle.PRIMARY} onClick={startGame}>
              {messages.action.start_game}
            </ActionButton>
          )}
          {isAdmin
            ? (
              <ActionButton style={ActionStyle.DANGER} onClick={() => gameService.cancelGame(lobby!.gameCode)}>
                {messages.action.cancel_game}
              </ActionButton>
            )
            : (
              <ActionButton style={ActionStyle.DANGER} onClick={() => gameService.quitGame(lobby!.gameCode)}>
                {messages.action.quit_game}
              </ActionButton>
            )
          }
        </div>
      </div>
    </Panel>
  );
}
