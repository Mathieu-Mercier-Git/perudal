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
  joinGame,
  removeOnMessage,
  socketListener,
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { getGlobalInstance } from 'plume-ts-di';
import { LobbyType } from '../../../services/game/GameTypes';
import GameService from '../../../services/game/GameService';
import { LOBBY } from '../../Routes';
import ValidationPopin from '../../theme/popin/ValidationPopin';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';


export default function Home() {
  const gameService = getGlobalInstance(GameService);

  const { messages } = useMessages();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('math');
  const [perucode, setPerucode] = useState<string>('');
  const [showJoinGamePopin, toggleJoinGamePopin] = useToggle(false);

  const listenerSwitchPhase = useCallback( // TODO : se documenter sur ce hook
    socketListener(ServerEvent.UPDATED_LOBBY, (response: LobbyType) => {
      gameService.setLobby(response);
      navigate(LOBBY);
      // TODO : stocker dans un localStorage
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
    gameService.setIsMainPlayer(true);
    createGame(username, 6);
    // TODO : add loader
    // navigate(LOBBY);
  };

  const joinLobby = () => {
    gameService.setIsMainPlayer(false);
    joinGame(perucode, username);
    // TODO loader
  };

  const onChangeUsername = (event) => {
    setUsername(event.target.value);
  };

  const onChangePerucode = (event) => {
    setPerucode(event.target.value);
  };

  return (
    <Panel>
      <h1>{messages.home.title}</h1>
      <TextField
        className="text-field"
        name="username"
        placeholder="Saisie ton pseudo"
        type="text"
        onChange={onChangeUsername}
        autoComplete="off"
        // inputProps={{ maxLength }}
      />
      <ActionButton onClick={createLobby}>
        {messages.action.create_game}
      </ActionButton>
      <ActionButton onClick={toggleJoinGamePopin}>
        {messages.action.join_game}
      </ActionButton>
      {showJoinGamePopin && (
        <ValidationPopin
          title="Saisie le pérucode de la partie"
          description="wesh"
          onValidation={joinLobby}
          onClose={toggleJoinGamePopin}
        >
          <TextField
            className="text-field"
            name="perucode"
            placeholder="Sasie le pérucode de la partie"
            type="text"
            onChange={onChangePerucode}
            autoComplete="off"
          />
        </ValidationPopin>
      )}
    </Panel>
  );
}
