import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { useObservable } from 'micro-observables';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { HOME } from '../../Routes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import GameService from '../../../services/game/GameService';
import { LobbyType } from '../../../services/game/GameTypes';

export default function Lobby() {
  const gameService = getGlobalInstance(GameService);
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());

  const { messages } = useMessages();
  const navigate = useNavigate();

  useOnComponentMounted(() => {
    // TODO : listen to any game changes
  });

  const startGame = () => {
    // TODO
  };

  const cancelGame = () => {
    // TODO
  };

  const quitGame = () => {
    // TODO
    navigate(HOME);
  };

  if (!lobby) {
    return (<div>ERROR NO LOBBY</div>);
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
      <ActionButton onClick={cancelGame}>
      {messages.action.cancel_game}
      </ActionButton>
      <ActionButton onClick={quitGame}>
        {messages.action.quit_game}
      </ActionButton>
    </Panel>
  );
}
