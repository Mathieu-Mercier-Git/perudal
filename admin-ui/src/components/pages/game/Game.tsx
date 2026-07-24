import React, { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { Panel } from '../../theme/layout/Panel';
import GameService from '../../../services/game/GameService';
import { Game, Player } from '../../../services/game/GameTypes';
import { GAME, HOME } from '../../Routes';
import Dice from './dice/Dice';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';
import { ActionButton } from '../../theme/action/Actions';
import DiceCounter from './dice/DiceCounter';
import {
  addOnMessage,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import FinishTurnPopin from './popin/FinishTurnPopin';

export default function Game() {
  const gameService = getGlobalInstance(GameService);
  const game: Game | undefined = useObservable(gameService.getGame());

  const [showMyDices, setShowMyDices] = useState(false);
  const [isRevealDices, setIsRevealDices] = useState(false);
  const [showFinishTurnPopin, setShowFinishTurnPopin] = useState(false);

  // const { messages } = useMessages();
  // const navigate = useNavigate();

  const listenerRevealDices = useCallback(
    socketListener(ServerEvent.REVEAL_DICES, () => {
      setIsRevealDices(true);
      setShowMyDices(true);
    }), [],
  );

  const listenerFinishTurn = useCallback(
    socketListener(ServerEvent.FINISH_TURN, (response: Game) => {
      // TODO : Mettre à jour la personne qui commence le tour
      setIsRevealDices(false);
      setShowMyDices(false);
      setShowFinishTurnPopin(false);
      gameService.setGame(response);
    }), [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerRevealDices);
    addOnMessage(listenerFinishTurn);

    return () => {
      removeOnMessage(listenerRevealDices);
      removeOnMessage(listenerFinishTurn);
    };
  });

  const opponents: Player[] = gameService.getOpponents(game);
  const mainPlayer: Player | undefined = gameService.getMainPlayer();

  const revealDices = () => {
    gameService.sendRevealDices(game?.gameCode);
    // TODO : accès à cette fonction uniquement si tu es admin
    // TODO : gérer le planificato
  }

  const finishTurn = (playerId: string, hasLost: boolean) => {
    gameService.finishTurn(game?.gameCode, playerId, hasLost);
  }

  if (!game) {
    return (<Navigate to={HOME} />);
  } // TODO : ajouter le total de dés sur la table
  // TODO : afficher que c'est le leader de la partie

  return (
    <Panel>
      <div className="game">
        <div className="game-header">
        </div>
        <div className="game-content">
          <div className="opponents-container">
            {opponents.map((opponent) => (
              <div key={opponent.id} className="opponent">
                {opponent.name}
                <div className="opponent-dices">
                  {opponent.dices.map((dice, index) => (
                    <Dice key={index} number={dice} show={isRevealDices}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {isRevealDices && (<DiceCounter game={game} />)}
          <div className="main-player">
            {mainPlayer && (
              <div className="main-player-dices">
                {mainPlayer.dices.map((dice, index) => (
                  <Dice key={index} number={dice} show={showMyDices}/>
                ))}
              </div>
            )}
            <ActionButton onClick={() => setShowMyDices(!showMyDices)} icon={showMyDices ? 'visibility' : 'visibility_off'}/>
            <span>Tu es maître du jeu, tes actions dictent la partie</span>
            {isRevealDices
              ? (<ActionButton onClick={() => setShowFinishTurnPopin(true)}>Fin du tour</ActionButton>)
              : (<ActionButton onClick={revealDices}>Révéler tous les dés</ActionButton>)
            }
          </div>
        </div>
      </div>
      {showFinishTurnPopin && (
       <FinishTurnPopin onClick={finishTurn} onClose={() => setShowFinishTurnPopin(false)} players={game.players} />
      )}
    </Panel>
  );
}
