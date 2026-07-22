import React from 'react';
import { Navigate } from 'react-router-dom';
import { useObservable } from 'micro-observables';
import { getGlobalInstance } from 'plume-ts-di';
import { Panel } from '../../theme/layout/Panel';
import GameService from '../../../services/game/GameService';
import { Game, Player } from '../../../services/game/GameTypes';
import { HOME } from '../../Routes';
import Dice from './Dice';
import useToggle from '../../../lib/react-hook-toggle/ReactHookToggle';
import { ActionButton } from '../../theme/action/Actions';
import DiceCounter from './DiceCounter';

export default function Game() {
  const gameService = getGlobalInstance(GameService);
  const game: Game | undefined = useObservable(gameService.getGame());

  const [showMyDices, toggleShowMyDices] = useToggle(false);

  // const { messages } = useMessages();
  // const navigate = useNavigate();

  const opponents: Player[] = gameService.getOpponents(game);
  const mainPlayer: Player | undefined = gameService.getMainPlayer();

  const endTour = () => { // TODO : accès à cette fonction uniquement si tu es admin
    // TODO 1 : Afficher à tout le monde combien de chaque il y avait
    // TODO 2 : afficher une popup qui propose de retirer ou d'ajouter des dés à un joueur
    // TOOD : gérer le planificato
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
                    <Dice key={index} number={dice} show={showMyDices}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DiceCounter game={game}/>
          <div className="main-player">
            {mainPlayer && (
              <div className="main-player-dices">
                {mainPlayer.dices.map((dice, index) => (
                  <Dice key={index} number={dice} show={showMyDices}/>
                ))}
              </div>
            )}
            <ActionButton onClick={toggleShowMyDices} icon={showMyDices ? 'visibility' : 'visibility_off'}/>
            <ActionButton onClick={toggleShowMyDices}>Fin du tour</ActionButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}
