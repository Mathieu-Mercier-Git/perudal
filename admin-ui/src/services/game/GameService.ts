import { Observable, observable, WritableObservable } from 'micro-observables';
import { HttpPromise } from 'simple-http-rest-client';
import { Logger } from 'simple-logging-system';
import {
  ChallengeType, Game, GameMode, GameSession, GameStatus, LobbyType, Player, RoundResult, RoundResultMessage,
} from './GameTypes';
import GameApi from '../../api/game/GameApi';
import {
  addOnMessage, getIdSocket, sendRevealDices, socketListener,
} from '../socket/SocketEngineService';
import { ServerEvent } from '../socket/SocketTypes';

const logger: Logger = new Logger('GameService');

const LOCAL_STORAGE_GAME_SESSION: string = 'game-session';

/**
 * Identité durable du joueur, conservée entre deux connexions.
 * Le `playerId` est généré par le serveur ; il survit au rechargement de la page
 * et au verrouillage du téléphone, contrairement à l'identifiant de socket.
 */
type StoredGameSession = {
  gameCode: string,
  playerId: string,
};

export default class GameService {
  private lobby: WritableObservable<LobbyType | undefined>;
  private game: WritableObservable<Game | undefined>;
  private playerId: WritableObservable<string | undefined>;
  private isRestoringSession: WritableObservable<boolean>;

  // Mode en ligne : résultat de la manche qui vient d'être résolue, affiché jusqu'au clic de l'admin sur « Tour suivant » ou à la fin du compte à rebours
  private roundResult: WritableObservable<RoundResult | undefined>;

  constructor(private readonly gameApi: GameApi) {
    const storedSession: StoredGameSession | undefined = GameService.readStoredSession();

    this.lobby = observable(undefined); // pas sûr que ça soit utile de l'avoir en observable
    this.game = observable(undefined); // pas sûr que ça soit utile de l'avoir en observable
    this.playerId = observable(storedSession?.playerId);
    // Tant que la reprise est en cours, les écrans ne doivent pas rediriger vers l'accueil
    this.isRestoringSession = observable(!!storedSession);
    this.roundResult = observable(undefined);

    // Écouté ici et non dans le lobby : le joueur doit entrer dans la partie quel que soit l'écran affiché
    addOnMessage(socketListener(ServerEvent.START_GAME, (game: Game) => {
      this.setGame(game);
      this.setLobby(undefined);
    }));
    // Mode en ligne : les actions des autres joueurs arrivent par la socket
    addOnMessage(socketListener(ServerEvent.BID_PLACED, (game: Game) => this.setGame(game)));
    addOnMessage(socketListener(ServerEvent.ROUND_RESULT, (message: RoundResultMessage) => {
      this.roundResult.set(message.result);
      this.setGame(message.game);
    }));
    addOnMessage(socketListener(ServerEvent.NEXT_ROUND, (game: Game) => {
      this.roundResult.set(undefined);
      this.setGame(game);
    }));
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

  getPlayerId(): Observable<string | undefined> {
    return this.playerId.readOnly();
  }

  getIsRestoringSession(): Observable<boolean> {
    return this.isRestoringSession.readOnly();
  }

  getRoundResult(): Observable<RoundResult | undefined> {
    return this.roundResult.readOnly();
  }

  getOpponents(): Player[] { // TODO : checker comment rejouter cette fonction uniquement quand l'observable bouge
    const game: Game | undefined = this.game.get();
    if (!game) {
      return [];
    }
    return game.players.filter((player: Player) => player.id !== this.playerId.get());
  }

  getMainPlayer(): Player | undefined { // TODO : checker comment rejouter cette fonction uniquement quand l'observable bouge
    const game: Game | undefined = this.game.get();
    if (!game) {
      return undefined;
    }
    return game.players.find((player: Player) => player.id === this.playerId.get());
  }

  /**
   * Reprend la partie en cours après une coupure (verrouillage du téléphone,
   * rechargement de page…). Appelée à chaque (re)connexion de la socket.
   */
  restoreSession(): void {
    const storedSession: StoredGameSession | undefined = GameService.readStoredSession();
    if (!storedSession) {
      this.isRestoringSession.set(false);
      return;
    }

    this.isRestoringSession.set(true);
    this.gameApi
      .reconnect({
        gameCode: storedSession.gameCode,
        playerId: storedSession.playerId,
        socketId: getIdSocket(),
      })
      .then((session: GameSession) => {
        this.applySession(session);
        this.isRestoringSession.set(false);
      })
      .catch((error: unknown) => {
        // La partie n'existe plus (annulée, serveur redémarré) ou le joueur en a été retiré
        logger.info('Impossible de reprendre la partie', { error });
        this.clearSession();
        this.isRestoringSession.set(false);
      });
  }

  createGame(userName: string, userEmoji: string, diceNumber: number): HttpPromise<void> {
    const userSocketId: string = getIdSocket();
    return this.gameApi.createGame({
      userSocketId, userName, userEmoji, diceNumber,
    })
      .then((session: GameSession) => this.applySession(session))
      .catch(() => logger.error('ERROR CREATE GAME'));
  }

  joinGame(userName: string, userEmoji: string, gameCode: string): HttpPromise<void> {
    const userSocketId: string = getIdSocket();
    return this.gameApi.joinGame({
      userSocketId, userName, userEmoji, gameCode,
    })
      .then((session: GameSession) => this.applySession(session));
  }

  setMode(gameCode: string, mode: GameMode): void {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return;
    }
    // Seul l'admin voit le mode : pas d'évènement socket, on met à jour son lobby après la réponse
    this.gameApi.setMode({ playerId, gameCode, mode })
      .then(() => {
        const lobby: LobbyType | undefined = this.lobby.get();
        if (lobby?.gameCode === gameCode) {
          this.setLobby({ ...lobby, mode });
        }
      })
      .catch((error: unknown) => logger.error('Impossible de changer le mode de jeu', { error }));
  }

  startGame(gameCode: string, diceNumber: number): void {
    this.gameApi.startGame({ gameCode, diceNumber });
  }

  quitGame(gameCode: string): void {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return;
    }
    this.gameApi.quitGame({ playerId, gameCode })
      .then(() => this.clearSession());
  }

  kickPlayer(gameCode: string, kickedPlayerId: string): void {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return;
    }
    // Le lobby mis à jour arrivera par l'évènement socket UPDATED_LOBBY
    this.gameApi.kickPlayer({ playerId, kickedPlayerId, gameCode });
  }

  cancelGame(gameCode: string): void {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return;
    }
    this.gameApi.cancelGame({ playerId, gameCode })
      .then(() => this.clearSession());
  }

  rollDices(gameCode: string): void {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return;
    }
    // Le jeu mis à jour arrivera par l'évènement socket ROLL_DICES
    this.gameApi.rollDices({ playerId, gameCode });
  }

  finishTurn(gameCode: string, playerId: string, hasLost: boolean): void {
    this.gameApi.finishTurn({ gameCode, playerId, hasLost });
  }

  /** Mode en ligne : la partie mise à jour arrivera par l'évènement socket BID_PLACED */
  placeBid(gameCode: string, quantity: number, face: number): HttpPromise<void> {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return new HttpPromise<void>(Promise.resolve());
    }
    return this.gameApi.placeBid({
      gameCode, playerId, quantity, face,
    });
  }

  /** Mode en ligne : le résultat arrivera par l'évènement socket ROUND_RESULT */
  challenge(gameCode: string, type: ChallengeType): HttpPromise<void> {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return new HttpPromise<void>(Promise.resolve());
    }
    return this.gameApi.challenge({ gameCode, playerId, type });
  }

  /** Mode en ligne, admin : tous les joueurs quitteront le résultat à l'évènement socket NEXT_ROUND */
  nextRound(gameCode: string): HttpPromise<void> {
    const playerId: string | undefined = this.playerId.get();
    if (!playerId) {
      return new HttpPromise<void>(Promise.resolve());
    }
    return this.gameApi.nextRound({ playerId, gameCode });
  }

  sendRevealDices(gameCode: string): void {
    sendRevealDices(gameCode);
  }

  /** Efface l'identité locale : la partie est terminée ou n'est plus accessible */
  clearSession(): void {
    localStorage.removeItem(LOCAL_STORAGE_GAME_SESSION);
    this.playerId.set(undefined);
    this.setLobby(undefined);
    this.setGame(undefined);
    this.roundResult.set(undefined);
  }

  private applySession(session: GameSession): void {
    this.playerId.set(session.playerId);
    GameService.storeSession({ gameCode: session.game.gameCode, playerId: session.playerId });

    // À la reconnexion, le résultat reste affiché tant que l'admin n'a pas lancé le tour suivant
    this.roundResult.set(session.game.lastRoundResult ?? undefined);
    if (session.status === GameStatus.IN_GAME) {
      this.setGame(session.game);
      this.setLobby(undefined);
    } else {
      this.setLobby({ gameCode: session.game.gameCode, players: session.game.players, mode: session.game.mode });
      this.setGame(undefined);
    }
  }

  private static storeSession(session: StoredGameSession): void {
    localStorage.setItem(LOCAL_STORAGE_GAME_SESSION, JSON.stringify(session));
  }

  private static readStoredSession(): StoredGameSession | undefined {
    const rawSession: string | null = localStorage.getItem(LOCAL_STORAGE_GAME_SESSION);
    if (!rawSession) {
      return undefined;
    }
    try {
      const session: StoredGameSession = JSON.parse(rawSession);
      return session.gameCode && session.playerId ? session : undefined;
    } catch (error) {
      logger.error('Session de jeu illisible dans le localStorage', { error });
      return undefined;
    }
  }
}
