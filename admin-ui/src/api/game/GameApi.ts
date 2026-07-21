import { HttpMethod } from 'simple-http-request-builder';
import { HttpPromise } from 'simple-http-rest-client';
import ApiHttpClient from '../ApiHttpClient';
import { ActionGame, JoinGameRequestBody, NewGameRequestBody, StartGame } from './GameApiType';
import { LobbyType } from '../../services/game/GameTypes';

export default class GameApi {
  private static readonly BASE_PATH = '/game';

  constructor(private readonly httpClient: ApiHttpClient) {
  }

  createGame(body: NewGameRequestBody): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.POST, `${GameApi.BASE_PATH}`)
      .jsonBody(body)
      .execute();
  }

  joinGame(body: JoinGameRequestBody): HttpPromise<LobbyType> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/join`)
      .jsonBody(body)
      .execute();
  }

  startGame(body: StartGame): HttpPromise<void> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/start`)
      .jsonBody(body)
      .execute();
  }

  quitGame(body: ActionGame): HttpPromise<void> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/quit`)
      .jsonBody(body)
      .execute();
  }

  cancelGame(body: ActionGame): HttpPromise<void> {
    return this
      .httpClient
      .restRequest<LobbyType>(HttpMethod.PUT, `${GameApi.BASE_PATH}/cancel`)
      .jsonBody(body)
      .execute();
  }
}
