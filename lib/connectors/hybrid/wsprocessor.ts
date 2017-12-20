import { Server as HttpServer } from "http";
import { Server as WebSocketServer } from "ws";
import { Socket } from "net";
import { EventEmitter } from "events";
import util = require("util");

const enum State {
  ST_STARTED = 1,
  ST_CLOSED = 2
}

export default class WSProcessor extends EventEmitter {
  private state: State;
  private httpServer: HttpServer;
  private wsServer: WebSocketServer;
  constructor() {
    super();
    this.httpServer = new HttpServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });

    this.wsServer.on("connection", socket => {
      this.emit("connection", socket);
    });
    this.state = State.ST_STARTED;
  }

  add(socket: Socket, data: any) {
    if (this.state != State.ST_STARTED) {
      return;
    }

    this.httpServer.emit("connection", socket);
    socket.emit("data", data);
  }

  close() {
    if (this.state != State.ST_STARTED) {
      return;
    }

    this.state = State.ST_CLOSED;
    this.wsServer.close();
    delete this.wsServer;
    delete this.httpServer;
  }
}

export { WSProcessor };
