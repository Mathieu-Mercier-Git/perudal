import { Observable, observable, WritableObservable } from 'micro-observables';
import { LobbyType } from './GameTypes';

export default class GameService {
  private lobby: WritableObservable<LobbyType | undefined>;

  constructor() {
    this.lobby = observable(undefined);
  }

  getLobby(): Observable<LobbyType | undefined> {
    return this.lobby.readOnly();
  }

  setLobby(currentLobby: LobbyType | undefined): void {
    this.lobby.set(currentLobby);
  }
}
