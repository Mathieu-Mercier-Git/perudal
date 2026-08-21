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
  FINISH_TURN = 'FINISH_TURN',
  KICKED = 'KICKED',
}
