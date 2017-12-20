import util = require("util");
import { EventEmitter } from "events";
import { Socket } from "net";
import { RemoteAddress } from "../pomelo";
const handler = require("./common/handler");
const protocol = require("pomelo-protocol");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const Package = protocol.Package;

enum State {
  ST_INITED = 0,
  ST_WAIT_ACK = 1,
  ST_WORKING = 2,
  ST_CLOSED = 3
}

export default class HybridSocket extends EventEmitter {
  private remoteAddress: RemoteAddress;
  private state: State;
  constructor(readonly id: number, readonly socket: any) {
    super();
    if (!socket._socket) {
      this.remoteAddress = {
        ip: socket.address().address,
        port: socket.address().port
      };
    } else {
      this.remoteAddress = {
        ip: socket._socket.remoteAddress,
        port: socket._socket.remotePort
      };
    }

    let self = this;

    socket.once("close", this.emit.bind(this, "disconnect"));
    socket.on("error", this.emit.bind(this, "error"));

    socket.on("message", (msg: any) => {
      if (msg) {
        msg = Package.decode(msg);
        handler(self, msg);
      }
    });

    this.state = State.ST_INITED;

    // TODO: any other events?
  }

  sendRaw(msg: any) {
    if (this.state !== State.ST_WORKING) {
      return;
    }
    let self = this;

    this.socket.send(msg, { binary: true }, (err: any) => {
      if (!!err) {
        logger.error("websocket send binary data failed: %j", err.stack);
        return;
      }
    });
  }

  send(msg: string | Buffer) {
    if (msg instanceof String) {
      msg = new Buffer(msg);
    } else if (!(msg instanceof Buffer)) {
      msg = new Buffer(JSON.stringify(msg));
    }
    this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
  }

  sendBatch(msgs: any[]) {
    let rs = [];
    for (let i = 0; i < msgs.length; i++) {
      let src = Package.encode(Package.TYPE_DATA, msgs[i]);
      rs.push(src);
    }
    this.sendRaw(Buffer.concat(rs));
  }

  sendForce(msg: any) {
    if (this.state === State.ST_CLOSED) {
      return;
    }
    this.socket.send(msg, { binary: true });
  }

  handshakeResponse(resp: any) {
    if (this.state !== State.ST_INITED) {
      return;
    }

    this.socket.send(resp, { binary: true });
    this.state = State.ST_WAIT_ACK;
  }

  disconnect() {
    if (this.state === State.ST_CLOSED) {
      return;
    }

    this.state = State.ST_CLOSED;
    this.socket.emit("close");
    this.socket.close();
  }
}
