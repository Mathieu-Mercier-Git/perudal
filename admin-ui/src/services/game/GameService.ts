import { Observable, observable, WritableObservable } from 'micro-observables';
import { Game, LobbyType } from './GameTypes';
import GameApi from '../../api/game/GameApi';
import { getIdSocket } from '../socket/SocketEngineService';

export default class GameService {
  private lobby: WritableObservable<LobbyType | undefined>;
  private game: WritableObservable<Game | undefined>;
  private isMainPlayer: WritableObservable<boolean>;

  // TODO : c'est dans le constructeur qu'on devra alimenter avec le localStorage
  constructor(private readonly gameApi: GameApi) {
    this.lobby = observable(undefined); // pas sûr que ça soit utile de l'avoir en observable
    this.game = observable(undefined); // pas sûr que ça soit utile de l'avoir en observable
    this.isMainPlayer = observable(false);
  }

  getLobby(): Observable<LobbyType | undefined> {
    return this.lobby.readOnly();
  }

  setLobby(currentLobby: LobbyType | undefined): void {
    this.lobby.set(currentLobby);
  }

  getGame(): Observable<Game | undefined> {
    return this.game.readOnly();
  }

  setGame(currentGame: Game | undefined): void {
    this.game.set(currentGame);
  }

  getIsMainPlayer(): Observable<boolean> {
    return this.isMainPlayer.readOnly();
  }

  setIsMainPlayer(isCurrentPlayer: boolean): void {
    this.isMainPlayer.set(isCurrentPlayer);
  }

  createGame(userName: string, diceNumber: number):void {
    const userSocketId = getIdSocket();
    this.setIsMainPlayer(true);
    return this.gameApi.createGame({userSocketId, userName, diceNumber})
      .then((lobby) => this.setLobby(lobby))
      .catch(() => console.error('ERROR CREATE GAME'))
  }

  joinGame(userName: string, gameCode: string):void {
    const userSocketId = getIdSocket();
    this.setIsMainPlayer(false);
    return this.gameApi.joinGame({userSocketId, userName, gameCode})
      .then((lobby) => this.setLobby(lobby))
  }

  startGame(gameCode: string, diceNumber): void {
    return this.gameApi.startGame({gameCode, diceNumber})
      .then(() => this.setLobby(undefined))
  }

  quitGame(gameCode: string):void {
    const userSocketId = getIdSocket();
    return this.gameApi.quitGame({userSocketId, gameCode})
      .then(() => this.setLobby(undefined))
  }

  cancelGame(gameCode: string):void {
    const userSocketId = getIdSocket();
    this.setIsMainPlayer(false);
    return this.gameApi.cancelGame({userSocketId, gameCode})
      .then(() => this.setLobby(undefined))
  }
}
