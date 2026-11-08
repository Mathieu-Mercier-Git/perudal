import React, { useState } from 'react';
import { Icon, TextField } from '@mui/material';
import { Navigate, useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { Logger } from 'simple-logging-system';
import { HttpError } from 'simple-http-rest-client';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { getGlobalInstance } from 'plume-ts-di';
import { Game, LobbyType } from '../../../services/game/GameTypes';
import GameService from '../../../services/game/GameService';
import { CONTACT, GAME, LOBBY } from '../../Routes';
import ValidationPopin from '../../theme/popin/ValidationPopin';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';
import UserService from '../../../services/user/UserService';
import RulesOverlayService, { RULES_SECTION_EXACT } from '../../../services/rules/RulesOverlayService';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import EmojiPickerPopin from './EmojiPickerPopin';
import AnimatedLoader from '../../layout/AnimatedLoader';
import MessageService from '../../../i18n/messages/MessageService';

const logger: Logger = new Logger('Home');

const toucanImage: string = '/assets/images/toucan.png';

enum UsernameError {
  MISSING='MISSING', TOO_SHORT='TOO_SHORT'
}

export default function Home() {
  const gameService = getGlobalInstance(GameService);
  const userService = getGlobalInstance(UserService);
  const rulesOverlayService = getGlobalInstance(RulesOverlayService);
  const username: string = useObservable(userService.getUsername());
  const emoji: string = useObservable(userService.getEmoji());
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());
  const game: Game | undefined = useObservable(gameService.getGame());
  const isRestoringSession: boolean = useObservable(gameService.getIsRestoringSession());

  const { messages } = useMessages();
  const navigate = useNavigate();

  const [perucode, setPerucode] = useState<string>('');
  const [perucodeError, setPerucodeError] = useState<string | undefined>(undefined);
  const [usernameError, setUsernameError] = useState<undefined | UsernameError>(undefined);
  const [showJoinGamePopin, toggleJoinGamePopin] = useToggle(false);
  const [showEmojiPickerPopin, toggleEmojiPickerPopin] = useToggle(false);

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
    // Une fois le lobby connu, l'écran redirige de lui-même
    gameService.createGame(username, emoji, 5);
  };

  const openJoinLobbyPopin = () => {
    if (usernameCheck()) {
      return;
    }
    setPerucodeError(undefined);
    toggleJoinGamePopin();
  };

  const joinErrorLabel = (error: HttpError): string => {
    switch (error.errorCode) {
      case 'GAME_NOT_FOUND':
        return messages.error.perucode_unknown;
      case 'GAME_ALREADY_STARTED':
        return messages.error.game_already_started;
      default:
        return MessageService.httpError(messages, error);
    }
  };

  const joinLobby = () => {
    if (!perucode.trim()) {
      setPerucodeError(messages.error.perucode_missing);
      return;
    }
    // Une fois le lobby connu, l'écran redirige de lui-même
    gameService.joinGame(username, emoji, perucode)
      .catch((error: HttpError) => {
        logger.info('Impossible de rejoindre la partie', { error });
        setPerucodeError(joinErrorLabel(error));
      });
  };

  const sanitizeUsername = (value: string): string => {
    const lettersAndSpaces = value.replace(/[^\p{L} ]/gu, '').replace(/^ +/, '');
    if (lettersAndSpaces.length === 0) {
      return lettersAndSpaces;
    }
    return lettersAndSpaces.charAt(0).toUpperCase() + lettersAndSpaces.slice(1);
  };

  const onChangeUsername = (event: React.ChangeEvent<HTMLInputElement>) => {
    userService.setUsername(sanitizeUsername(event.target.value));
  };

  const onSelectEmoji = (selectedEmoji: string) => {
    userService.setEmoji(selectedEmoji);
    toggleEmojiPickerPopin();
  };

  const onChangePerucode = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Le pérucode contient une lettre : on la remet en majuscule à la saisie
    setPerucode(event.target.value.toUpperCase());
    setPerucodeError(undefined);
  };

  // Reprise de session en cours : on attend la réponse du serveur avant de décider
  // quel écran afficher, sinon l'accueil apparaît brièvement à un joueur qui a une partie
  if (isRestoringSession) {
    return (
      <Panel>
        <div className="home"><AnimatedLoader /></div>
      </Panel>
    );
  }

  // Un joueur inscrit à une partie ne doit pas pouvoir revenir sur l'accueil (bouton Précédent du navigateur) :
  // il y resterait inscrit sans recevoir la suite de la partie
  if (game) {
    return (<Navigate to={GAME} replace />);
  }

  if (lobby) {
    return (<Navigate to={LOBBY} replace />);
  }

  return (
    <Panel>
      <div className="home">
        <button
          type="button"
          className="home__contact-link"
          onClick={() => navigate(CONTACT)}
          aria-label="Contact"
        >
          <Icon>mail</Icon>
        </button>
        <button
          type="button"
          className="home__rules-link"
          onClick={() => rulesOverlayService.open()}
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
          <button
            type="button"
            className="home__news"
            onClick={() => rulesOverlayService.open(RULES_SECTION_EXACT)}
          >
            <span className="home__news-badge">Nouveau</span>
            <span>Règle du chiffre exact modifiée</span>
            <Icon className="home__news-arrow">chevron_right</Icon>
          </button>
        </div>
        <div className="home__actions">
          <div className="home__identity">
            <button
              type="button"
              className="home__emoji"
              onClick={toggleEmojiPickerPopin}
              aria-label="Choisir ton emoji"
            >
              {emoji}
            </button>
            <TextField
              className="text-field"
              name="username"
              placeholder="Saisis ton pseudo"
              type="text"
              onChange={onChangeUsername}
              autoComplete="off"
              value={username}
              inputProps={{ maxLength: 25 }}
            />
          </div>
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
      {showEmojiPickerPopin && (
        <EmojiPickerPopin
          selectedEmoji={emoji}
          onSelect={onSelectEmoji}
          onClose={toggleEmojiPickerPopin}
        />
      )}
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
              value={perucode}
              inputProps={{ maxLength: 4 }}
              error={!!perucodeError}
            />
            {!!perucodeError && (
              <div className="error-message">
                {perucodeError}
              </div>
            )}
        </ValidationPopin>
      )}
    </Panel>
  );
}
