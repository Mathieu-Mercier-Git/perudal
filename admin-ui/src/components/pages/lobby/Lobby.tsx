import React, { useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { useObservable } from 'micro-observables';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { HOME } from '../../Routes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import GameService from '../../../services/game/GameService';
import { LobbyType } from '../../../services/game/GameTypes';
import {
  addOnMessage,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';

export default function Lobby() {
  const gameService = getGlobalInstance(GameService);
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());
  const isMainPlayer: boolean = useObservable(gameService.getIsMainPlayer());

  const { messages } = useMessages();
  const navigate = useNavigate();

  const listenerUpdateLobby = useCallback(
    socketListener(ServerEvent.UPDATED_LOBBY, (response: LobbyType) => {
      gameService.setLobby(response);
      // TODO : stocker dans un localStorage
    }),
    [],
  );

  const listenerCancelGame = useCallback( // TODO : ajouter une popin pour confirmer qu'on veut annuler la partie
    socketListener(ServerEvent.CANCEL_GAME, (response: String) => {
      console.log("CANCEL GAME : ", response);
      navigate(HOME); // TODO : rediriger avec vers HOME avec une popup d'information pour dire que la partie a été annulée
    }),
    [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerUpdateLobby);
    addOnMessage(listenerCancelGame);

    return () => {
      removeOnMessage(listenerUpdateLobby);
      removeOnMessage(listenerCancelGame);
    };
  });

  const startGame = () => {
    // TODO
  };

  if (!lobby) {
    return (<Navigate to={HOME} />);
  }

  return (
    <Panel>
      <h1>Lobby</h1>
      <div>
        <span>Pérucode de la partie : </span>
        <span>{lobby.gameCode}</span>
      </div>
      <div className="players">
        {React.Children.toArray(lobby.players.map((player) => (
          <div>{player.name}</div>
        )))}
      </div>
      <ActionButton onClick={startGame}>
        {messages.action.start_game}
      </ActionButton>
      {isMainPlayer
        ? (
          <ActionButton onClick={() => gameService.cancelGame(lobby!.gameCode)}>
            {messages.action.cancel_game}
          </ActionButton>
        )
        : (
          <ActionButton onClick={() => gameService.quitGame(lobby!.gameCode)}>
            {messages.action.quit_game}
          </ActionButton>
        )
      }
    </Panel>
  );
}
