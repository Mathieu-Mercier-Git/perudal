import { Observable, observable, WritableObservable } from 'micro-observables';
import { LobbyType } from './GameTypes';

export default class GameService {
  private lobby: WritableObservable<LobbyType | undefined>;
  private isMainPlayer: WritableObservable<boolean>;

  // TODO : c'est dans le constructeur qu'on devra alimenter avec le localStorage
  constructor() {
    this.lobby = observable(undefined);
    this.isMainPlayer = observable(false);
  }

  getLobby(): Observable<LobbyType | undefined> {
    return this.lobby.readOnly();
  }

  setLobby(currentLobby: LobbyType | undefined): void {
    this.lobby.set(currentLobby);
  }

  getIsMainPlayer(): Observable<boolean> {
    return this.isMainPlayer.readOnly();
  }

  setIsMainPlayer(isCurrentPlayer: boolean): void {
    this.isMainPlayer.set(isCurrentPlayer);
  }
}
