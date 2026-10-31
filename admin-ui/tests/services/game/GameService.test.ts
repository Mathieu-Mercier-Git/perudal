import GameApi from '../../../src/api/game/GameApi';
import GameService from '../../../src/services/game/GameService';
import { Game, LobbyType } from '../../../src/services/game/GameTypes';
import { ServerEvent } from '../../../src/services/socket/SocketTypes';
import { addOnMessage } from '../../../src/services/socket/SocketEngineService';

jest.mock('../../../src/services/socket/SocketEngineService', () => ({
  addOnMessage: jest.fn(),
  getIdSocket: jest.fn(() => 'socket-id'),
  sendRevealDices: jest.fn(),
  socketListener: (eventName: string, callback: (body: unknown) => void) => (event: { event: string, body: unknown }) => {
    if (event.event === eventName) {
      callback(event.body);
    }
  },
}));

function emit(event: ServerEvent, body: unknown): void {
  (addOnMessage as jest.Mock).mock.calls.forEach(([listener]) => listener({ event, body }));
}

describe('GameService', () => {
  beforeEach(() => {
    localStorage.clear();
    (addOnMessage as jest.Mock).mockClear();
  });

  test('entre dans la partie au lancement, sans dépendre de l\'écran affiché', () => {
    const service: GameService = new GameService({} as GameApi);
    const lobby = { gameCode: 'ABCD', players: [] } as unknown as LobbyType;
    const game = { gameCode: 'ABCD', players: [] } as unknown as Game;
    service.setLobby(lobby);

    emit(ServerEvent.START_GAME, game);

    expect(service.getGame().get()).toBe(game);
    expect(service.getLobby().get()).toBeUndefined();
  });
});
