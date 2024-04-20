import React, { useCallback, useState } from 'react';
import { TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import {
  addOnMessage,
  createGame,
  removeOnMessage,
  socketListener,
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { getGlobalInstance } from 'plume-ts-di';
import { LobbyType } from '../../../services/game/GameTypes';
import GameService from '../../../services/game/GameService';
import { LOBBY } from '../../Routes';


export default function Home() {
  const gameService = getGlobalInstance(GameService);

  const { messages } = useMessages();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('math');

  const listenerSwitchPhase = useCallback( // TODO : se documenter sur ce hook
    socketListener(ServerEvent.UPDATED_LOBBY, (response: LobbyType) => {
      gameService.setLobby(response);
      navigate(LOBBY);
      // TODO : rediriger vers la page de lobby avec les informations correspondantes
      // TODO : stocker dans un Observable (à méditer, un state peut suffire) + localStorage
    }),
    [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerSwitchPhase);

    return () => {
      removeOnMessage(listenerSwitchPhase);
    };
  });

  const createLobby = () => {
    // TODO : vérifier que le username est bien renseigné
    // TODO emit event lobby
    createGame(username, 6);
    // TODO : add loader
    // navigate(LOBBY);
  };

  const joinLobby = () => {
    // TODO open popup
  };

  const onChangeUsername = (event) => {
    setUsername(event.target.value);
  };

  return (
    <Panel>
      <h1>{messages.home.title}</h1>
      <TextField
        className="text-field"
        name="username"
        placeholder="Sasie ton pseudo"
        type="text"
        onChange={onChangeUsername}
        autoComplete="off"
        // inputProps={{ maxLength }}
      />
      <ActionButton onClick={createLobby}>
        {messages.action.create_game}
      </ActionButton>
      <ActionButton onClick={joinLobby}>
        {messages.action.join_game}
      </ActionButton>
    </Panel>
  );
}
