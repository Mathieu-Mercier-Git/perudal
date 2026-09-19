import React, { useCallback, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { Logger } from 'simple-logging-system';
import { Button, Icon } from '@mui/material';
import classNames from '../../../lib/class-names/ClassNames';
import { Panel } from '../../theme/layout/Panel';
import GameService from '../../../services/game/GameService';
import { Game, LobbyType, Player } from '../../../services/game/GameTypes';
import { HOME, LOBBY } from '../../Routes';
import Dice from './dice/Dice';
import { ActionButton, ActionsContainer } from '../../theme/action/Actions';
import { Popin } from '../../theme/popin/Popin';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import DiceCounter from './dice/DiceCounter';
import {
  addOnMessage,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import AnimatedLoader from '../../layout/AnimatedLoader';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { useOnComponentMounted, useOnComponentUnMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import FinishTurnPopin from './popin/FinishTurnPopin';
import FinishGamePopin from './popin/FinishGamePopin';
import GameMenuPopin from './popin/GameMenuPopin';
import RulesOverlayService from '../../../services/rules/RulesOverlayService';
import ValidationPopin from '../../theme/popin/ValidationPopin';

type ConfirmAction = {
  title: string,
  onValidation: () => void,
};

const logger: Logger = new Logger('Game');

// Délai (ms) pendant lequel « Révéler tous les dés » peut être annulé avant que l'action ne parte
const REVEAL_COUNTDOWN_MS: number = 2000;

export default function Game() {
  const gameService = getGlobalInstance(GameService);
  const rulesOverlayService = getGlobalInstance(RulesOverlayService);
  const game: Game | undefined = useObservable(gameService.getGame());
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());
  const playerId: string | undefined = useObservable(gameService.getPlayerId());
  const isRestoringSession: boolean = useObservable(gameService.getIsRestoringSession());

  const [showMyDices, setShowMyDices] = useState<boolean>(false);
  const [isRevealDices, setIsRevealDices] = useState<boolean>(false);
  const [showFinishTurnPopin, setShowFinishTurnPopin] = useState<boolean>(false);
  const [showMenuPopin, setShowMenuPopin] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | undefined>(undefined);
  const [isRevealPending, setIsRevealPending] = useState<boolean>(false);
  const [playerWinner, setPlayerWinner] = useState<Player | undefined>(undefined);
  const [showRollDicesInfo, setShowRollDicesInfo] = useState<boolean>(false);

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // const { messages } = useMessages();
  const navigate = useNavigate();

  // Dérivé de l'état et non figé au montage : après une reprise de session,
  // la partie n'est connue qu'une fois la réponse du serveur reçue
  const isAdmin: boolean = !!game?.players.find(player => player.id === playerId && player.isAdmin);

  const listenerRevealDices = useCallback(
    socketListener(ServerEvent.REVEAL_DICES, () => {
      setIsRevealDices(true);
      setShowMyDices(true);
    }), [],
  );

  const listenerFinishTurn = useCallback(
    socketListener(ServerEvent.FINISH_TURN, (response: Game) => {
      processIsGameFinished(response);
      setIsRevealDices(false);
      setShowMyDices(false);
      setShowFinishTurnPopin(false);
      gameService.setGame(response);
      logger.debug('EVENT FINISH_TURN', { response });
    }), [],
  );

  const listenerRollDices = useCallback(
    socketListener(ServerEvent.ROLL_DICES, (response: Game) => {
      // Les dés relancés repartent masqués, comme en début de tour
      setIsRevealDices(false);
      setShowMyDices(false);
      setShowRollDicesInfo(true); // tout le monde est prévenu que les dés ont changé
      gameService.setGame(response);
      logger.debug('EVENT ROLL_DICES', { response });
    }), [],
  );

  const listenerCancelGame = useCallback(
    socketListener(ServerEvent.CANCEL_GAME, () => {
      gameService.clearSession(); // la partie n'existe plus : on oublie l'identité locale
      navigate(HOME);
    }), [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerRevealDices);
    addOnMessage(listenerRollDices);
    addOnMessage(listenerFinishTurn);
    addOnMessage(listenerCancelGame);

    return () => {
      removeOnMessage(listenerRevealDices);
      removeOnMessage(listenerRollDices);
      removeOnMessage(listenerFinishTurn);
      removeOnMessage(listenerCancelGame);
    };
  });

  // Les joueurs éliminés (plus aucun dé) sont affichés en dernier dans la liste
  const opponents: Player[] = [...gameService.getOpponents()]
    .sort((a, b) => Number(b.dices.length > 0) - Number(a.dices.length > 0));
  const mainPlayer: Player | undefined = gameService.getMainPlayer();

  const processIsGameFinished = (currentGame: Game) => {
    const playersWithDices = currentGame.players.filter(player => player.diceNumber > 0);
    if (playersWithDices.length === 1) {
      setPlayerWinner(playersWithDices[0]);
    }
  }

  const revealDices = () => {
    if (!game) {
      return;
    }
    gameService.sendRevealDices(game.gameCode);
    // TODO : gérer le planificato
  }

  // Révélation différée : un compte à rebours annulable évite de révéler les dés sur un clic non voulu.
  const cancelRevealCountdown = () => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = undefined;
    }
    setIsRevealPending(false);
  };

  const handleRevealClick = () => {
    if (isRevealPending) {
      // Le joueur annule : le clic initial n'était pas volontaire
      cancelRevealCountdown();
      return;
    }
    setIsRevealPending(true);
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = undefined;
      setIsRevealPending(false);
      revealDices();
    }, REVEAL_COUNTDOWN_MS);
  };

  useOnComponentUnMounted(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
  });

  const finishTurn = (turnPlayerId: string, hasLost: boolean) => {
    if (!game) {
      return;
    }
    gameService.finishTurn(game.gameCode, turnPlayerId, hasLost);
  }

  const backToHome = () => {
    if (!game) {
      return;
    }
    gameService.cancelGame(game.gameCode);
  };

  const openRulesFromMenu = () => {
    setShowMenuPopin(false);
    rulesOverlayService.open();
  };

  // Admin : annule la partie pour tout le monde ; joueur : quitte la partie.
  // Ces actions déclenchent des évènements côté backend (comme dans le lobby).
  const leaveGame = () => {
    // TODO : gérer les évènements côté backend
    if (!game) {
      return;
    }
    if (isAdmin) {
      setConfirmAction({
        title: 'Es-tu sûr de vouloir annuler la partie ?',
        onValidation: () => gameService.cancelGame(game.gameCode),
      });
    } else {
      setConfirmAction({
        title: 'Es-tu sûr de vouloir quitter la partie ?',
        onValidation: () => gameService.quitGame(game.gameCode),
      });
    }
  };

  const onRollDices = () => {
    setConfirmAction({
      title: 'Es-tu sûr de vouloir relancer tous les dés ?',
      onValidation: () => {
        if (!game) {
          return;
        }
        gameService.rollDices(game.gameCode);
      },
    });
  }

  const whoStarts = (): string => {
    if (!game?.players.length) { // error
      logger.error('No player found');
      return 'Personne ne commence';
    }

    if (!game.playerIdFinishTurn) { // 1st tour
      return 'À vous de choisir qui commence'
    }

    const currentPlayer: Player | undefined = game.players.find(player => player.id === game.playerIdFinishTurn);
    if (!currentPlayer) { // error
      logger.error('No player found');
      return 'Personne ne commence';
    }

    if (currentPlayer.diceNumber === 0) {
      return `À gauche de ${currentPlayer.name}, tu commences`;
    } else if (currentPlayer.diceNumber === 1 && game.isPlanificato) {
      return `${currentPlayer.name} est en planificato`;
    } else {
      return `${currentPlayer.name}, tu commences`;
    }
  };

  const diceTotalQuantity: number = game?.players.reduce((total, player) => total + player.dices.length, 0) ?? 0;
  const isPlanificato: boolean | undefined = game?.isPlanificato;

  // Reprise de session en cours : on attend la réponse du serveur avant de décider
  // où envoyer le joueur, sinon on le renvoie à l'accueil alors qu'il a une partie
  if (isRestoringSession) {
    return (
      <Panel>
        <div className="game"><AnimatedLoader /></div>
      </Panel>
    );
  }

  if (!game) {
    // La partie n'a pas (re)démarré : si on a toujours un lobby, on y retourne
    return (<Navigate to={lobby ? LOBBY : HOME} />);
  } // TODO : ajouter le total de dés sur la table

  return (
    <Panel>
      <div className="game">
        <header className="game__header">
          <div className="game__header-top">
            <h1 className="game__title">{isPlanificato ? 'Pla pla planificato' : 'Partie en cours'}</h1>
            <div className="game__header-actions">
              <div className="game__total">
                <span className="game__total-num">{diceTotalQuantity}</span>
                <span className="game__total-label">dés</span>
              </div>
              <button
                type="button"
                className="game__rules-link"
                onClick={() => setShowMenuPopin(true)}
                aria-label="Menu"
              >
                <Icon>menu</Icon>
              </button>
            </div>
          </div>
          <div className="game__info">{whoStarts()}</div>
        </header>

        <div className="game__scroll">
          {isRevealDices && (<DiceCounter game={game} isPlanificato={isPlanificato} />)}
          <div className="game__opponents">
            {opponents.map((opponent) => (
              <div key={opponent.id} className="tile">
                <div className="tile__head">
                  <span className="tile__name">{opponent.name}</span>
                  {opponent.isAdmin && (<Icon className="tile__crown">star</Icon>)}
                  {opponent.dices.length === 0
                    && (<span className="tile__lost">a lamentablement perdu</span>)}
                </div>
                {opponent.dices.length > 0 && (
                  <div className="tile__dices">
                    {opponent.dices.map((dice, index) => (
                      <Dice key={index} number={dice} show={isRevealDices} isPlanificato={isPlanificato} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="game__tray">
          <div className="game__mydice">
            <span className="game__mydice-label">Tes dés</span>
            {mainPlayer && (
              mainPlayer.dices.length > 0
                ? (
                  <div className="game__mydice-list">
                    {mainPlayer.dices.map((dice, index) => (
                      <Dice key={index} number={dice} show={showMyDices} isPlanificato={isPlanificato} />
                    ))}
                  </div>
                )
                : (<div className="game__mydice-empty">Ils sont où tes dés ? Remets toi en question bonhomme.</div>)
            )}
          </div>
          <div className="game__tray-actions">
            {isAdmin
              ? (
                <ActionButton
                  style={ActionStyle.SECONDARY}
                  onClick={() => setShowMyDices(!showMyDices)}
                >
                  {showMyDices ? 'Masquer mes dés' : 'Révéler mes dés'}
                </ActionButton>
              )
              : (
                <ActionButton
                  cssClasses="action-container--icon"
                  onClick={() => setShowMyDices(!showMyDices)}
                  icon={showMyDices ? 'visibility' : 'visibility_off'}
                />
              )}
            {isAdmin && (
              isRevealDices
                ? (
                  <ActionButton style={ActionStyle.PRIMARY} onClick={() => setShowFinishTurnPopin(true)}>
                    Fin du tour
                  </ActionButton>
                )
                : (
                  <div
                    className={classNames(
                      'action-container',
                      'reveal-button',
                      { 'reveal-button--pending': isRevealPending },
                    )}
                  >
                    <Button variant="contained" color="primary" onClick={handleRevealClick}>
                      {isRevealPending && (
                        <span
                          className="reveal-button__progress"
                          style={{ animationDuration: `${REVEAL_COUNTDOWN_MS}ms` }}
                        />
                      )}
                      <span className="reveal-button__label">
                        {isRevealPending ? 'Annuler' : 'Révéler tous les dés'}
                      </span>
                    </Button>
                  </div>
                )
            )}
          </div>
        </div>
      </div>
      {showMenuPopin && (
        <GameMenuPopin
          isAdmin={isAdmin}
          onShowRules={openRulesFromMenu}
          onLeaveGame={leaveGame}
          onRollDices={onRollDices}
          onClose={() => setShowMenuPopin(false)}
        />
      )}
      {confirmAction && (
        <ValidationPopin
          zIndex={115}
          title={confirmAction.title}
          onValidation={() => {
            confirmAction.onValidation();
            setConfirmAction(undefined);
            setShowMenuPopin(false);
          }}
          onClose={() => setConfirmAction(undefined)}
        />
      )}
      {showRollDicesInfo && (
        <Popin zIndex={120}>
          <div className="popin-title">Tous les dés ont été relancés !</div>
          <div className="popin-buttons">
            <ActionsContainer>
              <ActionButton style={ActionStyle.PRIMARY} onClick={() => setShowRollDicesInfo(false)}>
                C&apos;est noté
              </ActionButton>
            </ActionsContainer>
          </div>
        </Popin>
      )}
      {showFinishTurnPopin && (
       <FinishTurnPopin onClick={finishTurn} onClose={() => setShowFinishTurnPopin(false)} players={game.players} />
      )}
      {!!playerWinner && (
        <FinishGamePopin onClick={backToHome} playerName={playerWinner.name} />
      )}
    </Panel>
  );
}
