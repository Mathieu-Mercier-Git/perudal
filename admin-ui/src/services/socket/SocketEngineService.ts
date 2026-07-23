import { SocketResponse } from './SocketTypes';
import generateLobbyId from '../../utils/StringUtils';

let socket: WebSocket;
let idSocket: string;

const WS_URL = 'ws://localhost:8080';

export const socketListener = (
  eventName: string,
  callback: (body: Object) => void,
) => {
  return (event: MessageEvent) => {
    console.log('TRIGGER FROM BACK event', event);
    const response: SocketResponse = JSON.parse(event.data);
    console.log('TRIGGER FROM BACK parsed', response);
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
    console.log("Initialisation socket", socket);
    // Événement appelé lors de l'ouverture de la connexion
    socket.onopen = function () {
      console.log("Connected to the WebSocket server");
      resolve(socket);
    };

    // Événement appelé lors de la réception d'un message du serveur
    socket.onmessage = function (event) {
      console.log("Message from server: " + event.data);
      if (event.data.includes("id:")) {
        idSocket = event.data.substring(3);
      }
    };

    // Événement appelé en cas d'erreur de la connexion WebSocket
    socket.onerror = function (error) {
      console.log("WebSocket error: ", error);
      reject(error);
    };

    // Événement appelé lorsque la connexion est fermée
    socket.onclose = function () {
      console.log("WebSocket connection closed");
    };
  });
};

export const getSocket = () => {
  return socket;
};

export const getIdSocket = () => {
  return idSocket;
};

export const createGame = (name: string, diceNumber: number) => {
  const gameCode = generateLobbyId();
  socket.send(`create_game/${gameCode}/${name}/${diceNumber}`);
}

export const joinGame = (gameCode: string, name: string) => {
  socket.send(`join_game/${gameCode}/${name}/6`);
}

export const quitGame = (gameCode: string) => {
  socket.send(`quit_game/${gameCode}`);
}

export const cancelGame = (gameCode: string) => {
  socket.send(`cancel_game/${gameCode}`);
}

export const sendRevealDices = (gameCode: string) => {
  socket.send(`reveal_dices/${gameCode}`);
}
