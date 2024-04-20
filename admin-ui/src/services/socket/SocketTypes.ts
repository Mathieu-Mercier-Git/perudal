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
}
