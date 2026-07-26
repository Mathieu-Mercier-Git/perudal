import React, { useCallback, useState } from 'react';
import { Icon, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { Logger } from 'simple-logging-system';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import { addOnMessage, removeOnMessage, socketListener, } from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { getGlobalInstance } from 'plume-ts-di';
import { LobbyType } from '../../../services/game/GameTypes';
import GameService from '../../../services/game/GameService';
import { LOBBY, RULES } from '../../Routes';
import ValidationPopin from '../../theme/popin/ValidationPopin';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';
import UserService from '../../../services/user/UserService';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';

const logger: Logger = new Logger('Home');

const toucanImage: string = '/assets/images/toucan.png';

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
    gameService.createGame(username, 5)
      .then(() => {
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
      .catch((error) => logger.error('ERROR JOIN GAME', { error }));
  };

  const onChangeUsername = (event) => {
    userService.setUsername(event.target.value);
  };

  const onChangePerucode = (event) => {
    setPerucode(event.target.value);
  };

  return (
    <Panel>
      <div className="home">
        <button
          type="button"
          className="home__rules-link"
          onClick={() => navigate(RULES)}
          aria-label="Règles du jeu"
        >
          <Icon>menu_book</Icon>
        </button>
        <div className="home__hero">
          <div className="home__logo">
            <img className="home__toucan" src={toucanImage} alt="" />
          </div>
          <h1 className="home__title">{messages.home.title}</h1>
          <p className="home__tagline">Le grand jeu de dés et de bluff</p>
        </div>
        <div className="home__actions">
          <TextField
            className="text-field"
            name="username"
            placeholder="Saisis ton pseudo"
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
          <ActionButton style={ActionStyle.PRIMARY} onClick={createLobby}>
            {messages.action.create_game}
          </ActionButton>
          <ActionButton style={ActionStyle.SECONDARY} onClick={openJoinLobbyPopin}>
            {messages.action.join_game}
          </ActionButton>
        </div>
      </div>
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
