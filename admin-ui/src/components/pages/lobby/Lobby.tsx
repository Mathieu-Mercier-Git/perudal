import React, { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getGlobalInstance } from 'plume-ts-di';
import { useObservable } from 'micro-observables';
import { Panel } from '../../theme/layout/Panel';
import useMessages from '../../../i18n/hooks/messagesHook';
import { ActionButton } from '../../theme/action/Actions';
import { GAME, HOME } from '../../Routes';
import { useOnComponentMounted } from '../../../lib/react-hooks-alias/ReactHooksAlias';
import GameService from '../../../services/game/GameService';
import { Game, LobbyType } from '../../../services/game/GameTypes';
import {
  addOnMessage,
  removeOnMessage,
  socketListener
} from '../../../services/socket/SocketEngineService';
import { ServerEvent } from '../../../services/socket/SocketTypes';

const DICE_NUMBER: number = 5;
const MIN_DICE_NUMBER: number = 1;
const MAX_DICE_NUMBER: number = 9;

export default function Lobby() {
  const gameService = getGlobalInstance(GameService);
  const lobby: LobbyType | undefined = useObservable(gameService.getLobby());
  const isMainPlayer: boolean = useObservable(gameService.getIsMainPlayer()); // TODO : peut être mutualiser avec la liste des joueurs remontés dans l'objet Lobby

  const [diceNumber, setDiceNumber] = useState<number>(DICE_NUMBER);

  const { messages } = useMessages();
  const navigate = useNavigate();

  const listenerUpdateLobby = useCallback(
    socketListener(ServerEvent.UPDATED_LOBBY, (response: LobbyType) => {
      gameService.setLobby(response);
      // TODO : stocker dans un localStorage
    }),
    [],
  );

  const listenerCancelGame = useCallback( // TODO : ajouter une popin pour confirmer qu'on veut annuler la partie
    socketListener(ServerEvent.CANCEL_GAME, (response: String) => {
      console.log("CANCEL GAME : ", response);
      navigate(HOME); // TODO : rediriger avec vers HOME avec une popup d'information pour dire que la partie a été annulée
    }),
    [],
  );

  const listenerStartGame = useCallback(
    socketListener(ServerEvent.START_GAME, (response: Game) => {
      gameService.setGame(response);
      console.log("START GAME : ", response);
      navigate(GAME);
    }),
    [],
  );

  useOnComponentMounted(() => {
    addOnMessage(listenerUpdateLobby);
    addOnMessage(listenerCancelGame);
    addOnMessage(listenerStartGame);

    return () => {
      removeOnMessage(listenerUpdateLobby);
      removeOnMessage(listenerCancelGame);
      removeOnMessage(listenerStartGame);
    };
  });

  const startGame = () => {
    // TODO : ajouter des conditions + une popin de confirmation
    // TODO : idée, chargement sur le bouton de 5sec avec possibilités d'annuler pendant ce laps de temps
    gameService.startGame(lobby!.gameCode, diceNumber);
  };

  const removeDice = (): void => {
    if (diceNumber > MIN_DICE_NUMBER) {
      setDiceNumber(diceNumber - 1);
    }
  };

  const addDice = (): void => {
    if (diceNumber < MAX_DICE_NUMBER) {
      setDiceNumber(diceNumber + 1);
    }
  };

  if (!lobby) {
    return (<Navigate to={HOME} />);
  }

  return (
    <Panel>
      <h1>{messages.lobby.title}</h1>
      <div>
        <span>{messages.lobby.perucode}</span>
        <span>{lobby.gameCode}</span>
      </div>
      {isMainPlayer && (
        <div className="lobby-dice-number-container">
          <span>{messages.lobby.dice_number}</span>
          <div className="lobby-dice-number">
            <ActionButton onClick={removeDice} icon='remove'/>
            <span>{diceNumber}</span>
            <ActionButton onClick={addDice} icon='add'/>
          </div>
        </div>
      )}
      <div className="players">
        <div className="players-title">{messages.lobby.player_list}</div>
        {React.Children.toArray(lobby.players.map((player) => (
          <div className="player">
            <span>-</span>
            <div className="player-name">{player.name}</div>
          </div>
        )))}
      </div>
      <ActionButton onClick={startGame}>
        {messages.action.start_game}
      </ActionButton>
      {isMainPlayer
        ? (
          <ActionButton onClick={() => gameService.cancelGame(lobby!.gameCode)}>
            {messages.action.cancel_game}
          </ActionButton>
        )
        : (
          <ActionButton onClick={() => gameService.quitGame(lobby!.gameCode)}>
            {messages.action.quit_game}
          </ActionButton>
        )
      }
    </Panel>
  );
}
