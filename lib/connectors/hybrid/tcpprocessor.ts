import util = require("util");
import utils = require("../../util/utils");
import TcpSocket from './tcpsocket';
import { EventEmitter } from "events";
import { Socket } from "net";

enum State {
  ST_STARTED = 1,
  ST_CLOSED = 2
}

// private protocol, no need exports
const HEAD_SIZE = 4;

export default class TCPProcessor extends EventEmitter {
  private state: State;
  constructor(private closeMethod: string) {
    super();
    this.state = State.ST_STARTED;
  }

  add(socket: Socket, data: any) {
    if (this.state !== State.ST_STARTED) {
      return;
    }
    let tcpsocket = new TcpSocket(socket, {
      headSize: HEAD_SIZE,
      headHandler: utils.headHandler,
      closeMethod: this.closeMethod
    });
    this.emit("connection", tcpsocket);
    socket.emit("data", data);
  }

  close() {
    if (this.state !== State.ST_STARTED) {
      return;
    }
    this.state = State.ST_CLOSED;
  }
}

export {TCPProcessor}