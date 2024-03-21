import { Logger } from 'simple-logging-system';

const WS_URL = 'ws://localhost:8080';
let idSocket: string;
// const logger = new Logger('SocketEngineService');

export default class SocketService {
  private socket?: WebSocket;
  // private idSocket?: string;
  constructor() {}

  initializeSocket() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(`${WS_URL}/socket`);
      console.log("Initialisation socket", this.socket);
      // Événement appelé lors de l'ouverture de la connexion
      this.socket.onopen = function () {
        console.log("Connected to the WebSocket server");
        resolve();
      };

      // Événement appelé lors de la réception d'un message du serveur
      this.socket.onmessage = function (event) {
        console.log("Message from server: " + event.data);
        if (event.data.includes("id:")) {
          idSocket = event.data.substring(3);
        }
      };

      // Événement appelé en cas d'erreur de la connexion WebSocket
      this.socket.onerror = function (error) {
        console.log("WebSocket error: ", error);
        reject(error);
      };

      // Événement appelé lorsque la connexion est fermée
      this.socket.onclose = function () {
        console.log("WebSocket connection closed");
      };
    });
  };

  socketListener(name: string, func: (args: string[]) => void) {
    return (event: MessageEvent) => {
      const data = event.data.split("/");
      const eventName = data[0];
      if (eventName === name) {
        data.shift();
        func(data);
      }
    };
  };

  addOnMessage(listener: any) {
    if (!this.socket) {
      console.log('Socket not initialized');
      return;
    }
    this.socket.addEventListener("message", listener);
  };

  removeOnMessage(listener: any) {
    if (!this.socket) {
      console.log('Socket not initialized');
      return;
    }
    this.socket.removeEventListener("message", listener);
  };
}

