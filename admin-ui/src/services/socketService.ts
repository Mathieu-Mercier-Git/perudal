// import { wsUrl } from "@/app/variables";

const wsUrl = 'ws://localhost:8080';

let socket: WebSocket;
let idSocket: string;

export const EVENT_START_KEY = "start";
export const EVENT_PLAY_KEY = "play";
export const EVENT_UPDATE_DAMAGES_KEY = "damages";
export const EVENT_JOIN_GAME_KEY = "join_game";
export const EVENT_WAITING_COUTDOWN_KEY = "waiting_countdown";
export const EVENT_FREE_PHASE_COUTDOWN_KEY = "free_phase_countdown";
export const EVENT_SWITCH_PHASE_KEY = "switch_phase";
export const EVENT_EXIT_GAME_KEY = "exit_game";
export const EVENT_CAN_ULTIMATE_KEY = "can_ultimate";
export const EVENT_NOTIFY_CELL_POSITION_KEY = "notify_cell_position";

export const socketListener = (
  name: string,
  func: (args: string[]) => void,
) => {
  return (event: MessageEvent) => {
    const data = event.data.split("/");
    const eventName = data[0];
    if (eventName === name) {
      data.shift();
      func(data);
    }
  };
};

export const addOnMessage = (listener: any) => {
  if (!socket) {
    console.log('Socket not initialized');
  }
  socket.addEventListener("message", listener);
};

export const removeOnMessage = (listener: any) => {
  if (!socket) {
    console.log('Socket not initialized');
  }socket.removeEventListener("message", listener);
};

export const initSocket = () => {
  return new Promise((resolve, reject) => {
    socket = new WebSocket(`${wsUrl}/socket`);
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
