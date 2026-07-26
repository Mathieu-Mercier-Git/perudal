import React, { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { Logger } from 'simple-logging-system';
import { Icon } from '@mui/material';
import { Panel } from '../../theme/layout/Panel';
import GameService from '../../../services/game/GameService';
import { Game, Player } from '../../../services/game/GameTypes';
import { HOME } from '../../Routes';
import Dice from './dice/Dice';
import { ActionButton } from '../../theme/action/Actions';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';
import DiceCounter from './dice/DiceCounter';
import {
  addOnMessage,
  getIdSocket,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import FinishTurnPopin from './popin/FinishTurnPopin';
import FinishGamePopin from './popin/FinishGamePopin';

const logger: Logger = new Logger('Game');

export default function Game() {
  const gameService = getGlobalInstance(GameService);
  const game: Game | undefined = useObservable(gameService.getGame());

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showMyDices, setShowMyDices] = useState<boolean>(false);
  const [isRevealDices, setIsRevealDices] = useState<boolean>(false);
  const [showFinishTurnPopin, setShowFinishTurnPopin] = useState<boolean>(false);
  const [playerIdFinishTurn, setPlayerIdFinishTurn] = useState<string>('');
  const [playerWinner, setPlayerWinner] = useState<Player | undefined>(undefined);

  // const { messages } = useMessages();
  const navigate = useNavigate();

  useOnComponentMounted(() => {
    if (game) {
      setIsAdmin(!!game.players.find(player => player.id === getIdSocket() && player.isAdmin));
    }
  });


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

  const listenerCancelGame = useCallback( // TODO : ajouter une popin pour confirmer qu'on veut annuler la partie
    socketListener(ServerEvent.CANCEL_GAME, () => {
      navigate(HOME);
    }), [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerRevealDices);
    addOnMessage(listenerFinishTurn);
    addOnMessage(listenerCancelGame);

    return () => {
      removeOnMessage(listenerRevealDices);
      removeOnMessage(listenerFinishTurn);
      removeOnMessage(listenerCancelGame);
    };
  });

  // Les joueurs éliminés (plus aucun dé) sont affichés en dernier dans la liste
  const opponents: Player[] = [...gameService.getOpponents(game)]
    .sort((a, b) => Number(b.dices.length > 0) - Number(a.dices.length > 0));
  const mainPlayer: Player | undefined = gameService.getMainPlayer();

  const processIsGameFinished = (currentGame: Game) => {
    const playersWithDices = currentGame.players.filter(player => player.diceNumber > 0);
    if (playersWithDices.length === 1) {
      setPlayerWinner(playersWithDices[0]);
    }
  }

  const revealDices = () => {
    gameService.sendRevealDices(game?.gameCode);
    // TODO : gérer le planificato
  }

  const finishTurn = (playerId: string, hasLost: boolean) => {
    setPlayerIdFinishTurn(playerId);
    gameService.finishTurn(game?.gameCode, playerId, hasLost);
  }

  const backToHome = () => {
    gameService.cancelGame(game?.gameCode);
  };

  const whoStarts = (): string => {
    if (!game?.players.length) { // error
      logger.error('No player found');
      return 'Personne ne commence';
    }

    if (!playerIdFinishTurn) { // 1st tour
      return 'À vous de choisir qui commence'
    }

    const currentPlayer: Player | undefined = game.players.find(player => player.id === playerIdFinishTurn);
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

  if (!game) {
    return (<Navigate to={HOME} />);
  } // TODO : ajouter le total de dés sur la table

  return (
    <Panel>
      <div className="game">
        <header className="game__header">
          <div className="game__header-top">
            <h1 className="game__title">{isPlanificato ? 'Pla pla planificato' : 'Partie en cours'}</h1>
            <div className="game__total">
              <span className="game__total-num">{diceTotalQuantity}</span>
              <span className="game__total-label">dés</span>
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
            <ActionButton
              cssClasses="action-container--icon"
              onClick={() => setShowMyDices(!showMyDices)}
              icon={showMyDices ? 'visibility' : 'visibility_off'}
            />
            {isAdmin && (
              isRevealDices
                ? (
                  <ActionButton style={ActionStyle.PRIMARY} onClick={() => setShowFinishTurnPopin(true)}>
                    Fin du tour
                  </ActionButton>
                )
                : (
                  <ActionButton style={ActionStyle.PRIMARY} onClick={revealDices}>
                    Révéler tous les dés
                  </ActionButton>
                )
            )}
          </div>
        </div>
      </div>
      {showFinishTurnPopin && (
       <FinishTurnPopin onClick={finishTurn} onClose={() => setShowFinishTurnPopin(false)} players={game.players} />
      )}
      {!!playerWinner && (
        <FinishGamePopin onClick={backToHome} playerName={playerWinner.name} />
      )}
    </Panel>
  );
}
