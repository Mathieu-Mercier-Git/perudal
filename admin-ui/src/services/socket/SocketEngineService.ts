import { Logger } from 'simple-logging-system';
import { SocketResponse } from './SocketTypes';

const logger: Logger = new Logger('SocketEngineService');

let socket: WebSocket;
let idSocket: string;

// The socket is served on the same origin as the application:
// - in development, Vite proxies /socket to the backend (see vite.config.ts)
// - in production, the reverse proxy (nginx) forwards /socket to the backend
// The `wss` scheme is mandatory when the application is served over HTTPS,
// otherwise the browser blocks the connection as mixed content
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}`;

export const socketListener = (
  eventName: string,
  callback: (body: Object) => void,
) => {
  return (event: MessageEvent) => {
    const response: SocketResponse = JSON.parse(event.data);
    if (response.status === 'ERROR') {
      // TODO : handle error (toastify ou truc du genre)
    }

    if (response.event && response.event === eventName) {
      callback(response.body);
    }
  };
};

export const addOnMessage = (listener: any) => {
  socket.addEventListener("message", listener);
};

export const removeOnMessage = (listener: any) => {
  socket.removeEventListener("message", listener);
};

export const initSocket = () => {
  return new Promise((resolve, reject) => {
    socket = new WebSocket(`${WS_URL}/socket`);
    logger.info(`Initialisation socket ${WS_URL}/socket`);
    // Événement appelé lors de l'ouverture de la connexion
    socket.onopen = function () {
      logger.info('Connected to the WebSocket server');
      resolve(socket);
    };

    // Événement appelé lors de la réception d'un message du serveur
    socket.onmessage = function (event) {
      if (event.data.includes("id:")) {
        idSocket = event.data.substring(3);
      }
    };

    // Événement appelé en cas d'erreur de la connexion WebSocket
    socket.onerror = function (error) {
      logger.error('WebSocket error', { error });
      reject(error);
    };

    // Événement appelé lorsque la connexion est fermée
    socket.onclose = function () {
      logger.info('WebSocket connection closed');
    };
  });
};

export const getSocket = () => {
  return socket;
};

export const getIdSocket = () => {
  return idSocket;
};

export const sendRevealDices = (gameCode: string) => {
  socket.send(`reveal_dices/${gameCode}`);
}
