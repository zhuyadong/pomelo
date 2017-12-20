import { extend } from "../util/utils";
import util = require("util");
import { EventEmitter } from "events";
import SioSocket from "./siosocket";
const httpServer = require("http").createServer();

const PKG_ID_BYTES = 4;
const PKG_ROUTE_LENGTH_BYTES = 1;
const PKG_HEAD_BYTES = PKG_ID_BYTES + PKG_ROUTE_LENGTH_BYTES;

let curId = 1;

export interface SioConnectorOpts {
  transports: string[];
  heartbeats: boolean;
  closeTimeout: number;
  heartbeatTimeout: number;
  heartbeatInterval: number;
}

export default class SioConnector extends EventEmitter {
  readonly heartbeats: boolean;
  readonly closeTimeout: number;
  readonly heartbeatTimeout: number;
  readonly heartbeatInterval: number;
  private wsocket:any;
  constructor(
    readonly port: number,
    readonly host: string,
    readonly opts: SioConnectorOpts
  ) {
    super();
    if (!(this instanceof SioConnector)) {
      return new SioConnector(port, host, opts);
    }

    this.port = port;
    this.host = host;
    this.opts = opts;
    this.heartbeats = opts.heartbeats || true;
    this.closeTimeout = opts.closeTimeout || 60;
    this.heartbeatTimeout = opts.heartbeatTimeout || 60;
    this.heartbeatInterval = opts.heartbeatInterval || 25;
  }
  start(cb:Function) {
    // issue https://github.com/NetEase/pomelo-cn/issues/174
    let opts = {};
    if (!!this.opts) {
      opts = this.opts;
    } else {
      opts = {
        transports: ["websocket", "polling-xhr", "polling-jsonp", "polling"]
      };
    }

    let sio = require("socket.io")(httpServer, opts);

    let port = this.port;
    httpServer.listen(port, ()=> {
      console.log("sio Server listening at port %d", port);
    });
    sio.set("resource", "/socket.io");
    sio.set("transports", this.opts.transports);
    sio.set("heartbeat timeout", this.heartbeatTimeout);
    sio.set("heartbeat interval", this.heartbeatInterval);

    sio.on("connection", (socket:any) => {
      let siosocket = new SioSocket(curId++, socket);
      this.emit("connection", siosocket);
      siosocket.on("closing", (reason)=> {
        siosocket.send({ route: "onKick", reason: reason });
      });
    });

    process.nextTick(cb);
  }

  stop(force: boolean, cb: Function) {
    this.wsocket.server.close();
    process.nextTick(cb);
  }

  encode(reqId: number, route: string, msg: any) {
    return SioConnector.encode(reqId, route, msg);
  }

  static encode(reqId: number, route: string, msg: any) {
    if (reqId) {
      return composeResponse(reqId, route, msg);
    } else {
      return composePush(route, msg);
    }
  }

  decode(msg: any) {
    return SioConnector.decode(msg);
  }

  static decode(msg: any) {
    let index = 0;

    let id = parseIntField(msg, index, PKG_ID_BYTES);
    index += PKG_ID_BYTES;

    let routeLen = parseIntField(msg, index, PKG_ROUTE_LENGTH_BYTES);

    let route = msg.substr(PKG_HEAD_BYTES, routeLen);
    let body = msg.substr(PKG_HEAD_BYTES + routeLen);

    return {
      id: id,
      route: route,
      body: JSON.parse(body)
    };
  }
}

function composeResponse(msgId: number, route: string, msgBody: any) {
  return {
    id: msgId,
    body: msgBody
  };
}

function composePush(route: string, msgBody: any) {
  return JSON.stringify({ route: route, body: msgBody });
}

function parseIntField(str: string, offset: number, len: number) {
  let res = 0;
  for (let i = 0; i < len; i++) {
    if (i > 0) {
      res <<= 8;
    }
    res |= str.charCodeAt(offset + i) & 0xff;
  }

  return res;
}
