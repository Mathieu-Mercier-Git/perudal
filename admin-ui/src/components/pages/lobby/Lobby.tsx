import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { HOME } from '../../Routes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import generateLobbyId from '../../../utils/StringUtils';

export default function Lobby() {
  const { messages } = useMessages();
  const navigate = useNavigate();

  const [lobbyId, setLobbyId] = useState<string>('');

  useOnComponentMounted(() => {
    setLobbyId(generateLobbyId());
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

  return (
    <Panel>
      <h1>Lobby</h1>
      <div>
        <span>Pérucode de la partie : </span>
        <span>{lobbyId}</span>
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
