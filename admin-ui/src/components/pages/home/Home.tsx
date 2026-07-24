import React, { useCallback, useState } from 'react';
import { TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import { addOnMessage, removeOnMessage, socketListener, } from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { getGlobalInstance } from 'plume-ts-di';
import { LobbyType } from '../../../services/game/GameTypes';
import GameService from '../../../services/game/GameService';
import { LOBBY } from '../../Routes';
import ValidationPopin from '../../theme/popin/ValidationPopin';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';
import UserService from '../../../services/user/UserService';

enum UsernameError {
  MISSING='MISSING', TOO_SHORT='TOO_SHORT'
}

export default function Home() {
  const gameService = getGlobalInstance(GameService);
  const userService = getGlobalInstance(UserService);
  const username: string = useObservable(userService.getUsername());

  const { messages } = useMessages();
  const navigate = useNavigate();

  const [perucode, setPerucode] = useState<string>('');
  const [usernameError, setUsernameError] = useState<undefined | UsernameError>(undefined);
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

  const usernameErrorLabel = () => usernameError == UsernameError.TOO_SHORT
      ? messages.error.username_too_short
      : messages.error.username_missing

  const usernameCheck = (): boolean => {
    let tempUsernameError: undefined | UsernameError = undefined;
    if (!username) {
      tempUsernameError = UsernameError.MISSING;
    } else if (username.length < 2) {
      tempUsernameError = UsernameError.TOO_SHORT;
    }
    setUsernameError(tempUsernameError);
    return !!tempUsernameError;
  };

  const createLobby = () => {
    if (usernameCheck()) {
      return;
    }
    // TODO emit event lobby
    gameService.createGame(username, 5)
      .then(() => {
        console.log('createGame LALALAL')
        navigate(LOBBY);
      });
  };

  const openJoinLobbyPopin = () => {
    if (usernameCheck()) {
      return;
    }
    toggleJoinGamePopin();
  };

  const joinLobby = () => {
    gameService.joinGame(username, perucode)
      .then(() => {
        navigate(LOBBY);
      })
      .catch((error) => console.error({ error }));
  };

  const onChangeUsername = (event) => {
    userService.setUsername(event.target.value);
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
        defaultValue={username}
        // inputProps={{ maxLength }}
      />
      {!!usernameError && (
        <div className="error-message">
          {usernameErrorLabel()}
        </div>
      )}
      <ActionButton onClick={createLobby}>
        {messages.action.create_game}
      </ActionButton>
      <ActionButton onClick={openJoinLobbyPopin}>
        {messages.action.join_game}
      </ActionButton>
      {showJoinGamePopin && (
        <ValidationPopin
          title="Saisie le pérucode de la partie"
          onValidation={joinLobby}
          onClose={toggleJoinGamePopin}
        >
            <TextField
              className="text-field"
              name="perucode"
              placeholder="Pérucode"
              type="text"
              onChange={onChangePerucode}
              autoComplete="off"
            />
        </ValidationPopin>
      )}
    </Panel>
  );
}
