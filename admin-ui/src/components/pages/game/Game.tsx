import React, { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { Panel } from '../../theme/layout/Panel';
import GameService from '../../../services/game/GameService';
import { Game, Player } from '../../../services/game/GameTypes';
import { HOME } from '../../Routes';
import Dice from './dice/Dice';
import { ActionButton } from '../../theme/action/Actions';
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
      console.log('EVENT FINISH_TURN', response);
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

  const opponents: Player[] = gameService.getOpponents(game);
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
      console.error('No player found');
      return 'Personne ne commence';
    }

    if (!playerIdFinishTurn) { // 1st tour
      return 'À vous de choisir qui commence'
    }

    const currentPlayer: Player | undefined = game.players.find(player => player.id === playerIdFinishTurn);
    if (!currentPlayer) { // error
      console.error('No player found');
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
        <div className="game-header">
          <h1>{isPlanificato ? 'Pla pla planificato' : 'Partie en cours'}</h1>
          <div>{whoStarts()}</div>
          <div>
            <span>Nombre total de dés : </span>
            <span>{diceTotalQuantity}</span>
          </div>
        </div>
        <div className="game-content">
          <div className="opponents-container">
            {opponents.map((opponent) => (
              <div key={opponent.id} className="opponent">
                <span>{opponent.name}</span>
                {opponent.isAdmin && (
                  <span> (boss)</span>
                )}
                {opponent.dices.length > 0
                  ? (
                    <div className="opponent-dices">
                      {opponent.dices.map((dice, index) => (
                        <Dice key={index} number={dice} show={isRevealDices} isPlanificato={isPlanificato} />
                      ))}
                    </div>
                  )
                  : (<span> a lamentablement perdu</span>)
                }

              </div>
            ))}
          </div>
          {isRevealDices && (<DiceCounter game={game} isPlanificato={isPlanificato} />)}
          <div className="main-player">
            {mainPlayer && (
              mainPlayer.dices.length > 0
                ? (
                  <div className="main-player-dices">
                    {mainPlayer.dices.map((dice, index) => (
                      <Dice key={index} number={dice} show={showMyDices} isPlanificato={isPlanificato} />
                    ))}
                  </div>
                )
              : (<div>Ils sont où tes dés ? Remets toi en question bonhomme.</div>)
            )}
            <ActionButton onClick={() => setShowMyDices(!showMyDices)} icon={showMyDices ? 'visibility' : 'visibility_off'}/>
            {isAdmin && (
              <>
                <span>Tu es maître du jeu, tes actions dictent la partie</span>
                {isRevealDices
                  ? (<ActionButton onClick={() => setShowFinishTurnPopin(true)}>Fin du tour</ActionButton>)
                  : (<ActionButton onClick={revealDices}>Révéler tous les dés</ActionButton>)
                }
              </>
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
