export type SocketResponse = {
  status: 'SUCCESS' | 'ERROR',
  event?: ServerEvent,
  message?: string,
  body?: Object,
};

export enum ClientEvent {
  CREATE_GAME = 'create_game',
  JOIN_GAME = 'join_game',
}

export enum ServerEvent {
  UPDATED_LOBBY = 'UPDATED_LOBBY',
  QUIT_GAME = 'QUIT_GAME',
  CANCEL_GAME = 'CANCEL_GAME',
  START_GAME = 'START_GAME',
  REVEAL_DICES = 'REVEAL_DICES',
  ROLL_DICES = 'ROLL_DICES',
  FINISH_TURN = 'FINISH_TURN',
  KICKED = 'KICKED',
  // Mode local
  PLAYER_LEFT = 'PLAYER_LEFT',
  // Mode en ligne
  BID_PLACED = 'BID_PLACED',
  ROUND_RESULT = 'ROUND_RESULT',
  NEXT_ROUND = 'NEXT_ROUND',
}
