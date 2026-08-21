import { HttpMethod } from 'simple-http-request-builder';
import { HttpPromise } from 'simple-http-rest-client';
import ApiHttpClient from '../ApiHttpClient';
import {
  ActionGame, TurnInfo, JoinGameRequestBody, KickPlayer, NewGameRequestBody, ReconnectRequestBody, StartGame,
} from './GameApiType';
import { GameSession, LobbyType } from '../../services/game/GameTypes';

export default class GameApi {
  private static readonly BASE_PATH = '/game';

  constructor(private readonly httpClient: ApiHttpClient) {
  }

  createGame(body: NewGameRequestBody): HttpPromise<GameSession> {
    return this
      .httpClient
      .restRequest<GameSession>(HttpMethod.POST, `${GameApi.BASE_PATH}`)
      .jsonBody(body)
      .execute();
  }

  joinGame(body: JoinGameRequestBody): HttpPromise<GameSession> {
    return this
      .httpClient
      .restRequest<GameSession>(HttpMethod.PUT, `${GameApi.BASE_PATH}/join`)
      .jsonBody(body)
      .execute();
  }

  reconnect(body: ReconnectRequestBody): HttpPromise<GameSession> {
    return this
      .httpClient
      .restRequest<GameSession>(HttpMethod.PUT, `${GameApi.BASE_PATH}/reconnect`)
      .jsonBody(body)
      .execute();
  }

  startGame(body: StartGame): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/start`)
      .jsonBody(body)
      .execute();
  }

  quitGame(body: ActionGame): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/quit`)
      .jsonBody(body)
      .execute();
  }

  kickPlayer(body: KickPlayer): HttpPromise<void> {
    return this
      .httpClient
      .restRequest<void>(HttpMethod.PUT, `${GameApi.BASE_PATH}/kick`)
      .jsonBody(body)
      .execute();
  }

  cancelGame(body: ActionGame): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/cancel`)
      .jsonBody(body)
      .execute();
  }

  finishTurn(body: TurnInfo): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/finish-turn`)
      .jsonBody(body)
      .execute();
  }
}
