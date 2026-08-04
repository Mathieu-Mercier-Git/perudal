import { Logger } from 'simple-logging-system';
import { SocketResponse } from './SocketTypes';

const logger: Logger = new Logger('SocketEngineService');

// The socket is served on the same origin as the application:
// - in development, Vite proxies /socket to the backend (see vite.config.ts)
// - in production, the reverse proxy (nginx) forwards /socket to the backend
// The `wss` scheme is mandatory when the application is served over HTTPS,
// otherwise the browser blocks the connection as mixed content
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_PROTOCOL}//${window.location.host}`;

const RECONNECT_BASE_DELAY_MS: number = 500;
const RECONNECT_MAX_DELAY_MS: number = 10000;

let socket: WebSocket | undefined;
let idSocket: string = '';
let reconnectAttempts: number = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
let areGlobalListenersRegistered: boolean = false;

// Les listeners sont conservés ici et non sur l'instance WebSocket : celle-ci est
// remplacée à chaque reconnexion, et les listeners posés dessus seraient perdus.
const messageListeners: Set<(event: MessageEvent) => void> = new Set();
// Appelés à CHAQUE connexion établie (première connexion comme reconnexions),
// une fois l'identifiant de socket reçu du serveur
const connectedListeners: Set<() => void> = new Set();

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
  messageListeners.add(listener);
  socket?.addEventListener('message', listener);
};

export const removeOnMessage = (listener: any) => {
  messageListeners.delete(listener);
  socket?.removeEventListener('message', listener);
};

export const addOnConnected = (listener: () => void) => {
  connectedListeners.add(listener);
};

export const removeOnConnected = (listener: () => void) => {
  connectedListeners.delete(listener);
};

const notifyConnected = () => {
  connectedListeners.forEach((listener: () => void) => {
    try {
      listener();
    } catch (error: unknown) {
      logger.error('A connection listener failed', { error });
    }
  });
};

type FirstConnection = {
  resolve: (value: unknown) => void,
  reject: (reason: unknown) => void,
};

const connect = (firstConnection?: FirstConnection) => {
  const currentSocket: WebSocket = new WebSocket(`${WS_URL}/socket`);
  socket = currentSocket;
  logger.info(`Initialisation socket ${WS_URL}/socket`);

  // On réinstalle les listeners déjà enregistrés sur la nouvelle instance
  messageListeners.forEach(
    (listener: (event: MessageEvent) => void) => currentSocket.addEventListener('message', listener),
  );

  // Le serveur envoie `id:<uuid>` juste après l'ouverture : tant qu'on ne l'a pas reçu,
  // on ne peut pas s'identifier auprès de l'API, donc la connexion n'est pas "prête"
  const identificationListener = (event: MessageEvent) => {
    if (typeof event.data !== 'string' || !event.data.startsWith('id:')) {
      return;
    }
    idSocket = event.data.substring(3);
    currentSocket.removeEventListener('message', identificationListener);
    reconnectAttempts = 0;
    firstConnection?.resolve(currentSocket);
    notifyConnected();
  };
  currentSocket.addEventListener('message', identificationListener);

  currentSocket.onopen = () => {
    logger.info('Connected to the WebSocket server');
  };

  currentSocket.onerror = (error: Event) => {
    logger.error('WebSocket error', { error });
    firstConnection?.reject(error);
  };

  currentSocket.onclose = () => {
    logger.info('WebSocket connection closed');
    scheduleReconnect();
  };
};

const scheduleReconnect = () => {
  if (reconnectTimeout) {
    return;
  }
  const delay: number = Math.min(
    RECONNECT_BASE_DELAY_MS * (2 ** reconnectAttempts),
    RECONNECT_MAX_DELAY_MS,
  );
  reconnectAttempts += 1;
  logger.info(`Reconnecting to the WebSocket server in ${delay}ms`);
  reconnectTimeout = setTimeout(
    () => {
      reconnectTimeout = undefined;
      connect();
    },
    delay,
  );
};

/**
 * Reconnexion immédiate : iOS suspend l'onglet quand le téléphone se verrouille,
 * la socket est alors fermée sans que le backoff n'ait de raison d'attendre.
 */
const reconnectNow = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = undefined;
  }
  reconnectAttempts = 0;
  connect();
};

const registerGlobalListeners = () => {
  if (areGlobalListenersRegistered) {
    return;
  }
  areGlobalListenersRegistered = true;
  window.addEventListener('online', reconnectNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      reconnectNow();
    }
  });
};

export const initSocket = () => {
  return new Promise((resolve, reject) => {
    registerGlobalListeners();
    connect({ resolve, reject });
  });
};

export const getSocket = () => {
  return socket;
};

export const getIdSocket = () => {
  return idSocket;
};

export const sendRevealDices = (gameCode: string) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logger.error('Cannot reveal dices: the socket is not connected');
    return;
  }
  socket.send(`reveal_dices/${gameCode}`);
};
