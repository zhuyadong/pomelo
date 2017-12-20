import util = require("util");
import { EventEmitter } from "events";
import { Socket } from "net";
import { RemoteAddress } from "../pomelo";

enum State {
  ST_INITED = 0,
  ST_CLOSED = 1
}

export default class SioSocket extends EventEmitter {
  private remoteAddress: RemoteAddress;
  private state: State;
  constructor(readonly id: number, readonly socket: any) {
    super();
    this.id = id;
    this.socket = socket;
    this.remoteAddress = {
      ip: socket.handshake.address.address,
      port: socket.handshake.address.port
    };

    socket.on("disconnect", this.emit.bind(this, "disconnect"));

    socket.on("error", this.emit.bind(this, "error"));

    socket.on("message", (msg: any) => {
      this.emit("message", msg);
    });

    this.state = State.ST_INITED;

    // TODO: any other events?
  }
  send(msg: any) {
    if (this.state !== State.ST_INITED) {
      return;
    }
    if (typeof msg !== "string") {
      msg = JSON.stringify(msg);
    }
    this.socket.send(msg);
  }

  disconnect() {
    if (this.state === State.ST_CLOSED) {
      return;
    }

    this.state = State.ST_CLOSED;
    this.socket.disconnect();
  }

  sendBatch(msgs: any[]) {
    this.send(encodeBatch(msgs));
  }
}

function encodeBatch(msgs: any[]) {
  let res = "[",
    msg;
  for (let i = 0, l = msgs.length; i < l; i++) {
    if (i > 0) {
      res += ",";
    }
    msg = msgs[i];
    if (typeof msg === "string") {
      res += msg;
    } else {
      res += JSON.stringify(msg);
    }
  }
  res += "]";
  return res;
}
