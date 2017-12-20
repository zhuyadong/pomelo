import util = require("util");
import WSProcessor from "./wsprocessor";
import TCPProcessor from "./tcpprocessor";
import { EventEmitter } from "events";
import { Server, Socket } from "net";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

const HTTP_METHODS = ["GET", "POST", "DELETE", "PUT", "HEAD"];

enum State {
  ST_STARTED = 1,
  ST_CLOSED = 2
}

const DEFAULT_TIMEOUT = 90;

export default class Switcher extends EventEmitter {
  private wsprocessor: WSProcessor;
  private tcpprocessor: TCPProcessor;
  private id: number;
  private timeout: number;
  private setNoDelay: boolean;
  private state: State;
  constructor(private server: Server, opts: any) {
    super();

    this.server = server;
    this.wsprocessor = new WSProcessor();
    this.tcpprocessor = new TCPProcessor(opts.closeMethod);
    this.id = 1;
    this.timeout = (opts.timeout || DEFAULT_TIMEOUT) * 1000;
    this.setNoDelay = opts.setNoDelay;

    if (!opts.ssl) {
      this.server.on("connection", this.newSocket.bind(this));
    } else {
      this.server.on("secureConnection", this.newSocket.bind(this));
      this.server.on("clientError", (e, tlsSo) => {
        logger.warn("an ssl error occured before handshake established: ", e);
        tlsSo.destroy();
      });
    }

    this.wsprocessor.on("connection", this.emit.bind(this, "connection"));
    this.tcpprocessor.on("connection", this.emit.bind(this, "connection"));

    this.state = State.ST_STARTED;
  }
  newSocket(socket: Socket) {
    if (this.state !== State.ST_STARTED) {
      return;
    }

    socket.setTimeout(this.timeout, () => {
      logger.warn(
        "connection is timeout without communication, the remote ip is %s && port is %s",
        socket.remoteAddress,
        socket.remotePort
      );
      socket.destroy();
    });

    socket.once("data", data => {
      // FIXME: handle incomplete HTTP method
      if (isHttp(data)) {
        processHttp(this, this.wsprocessor, socket, data);
      } else {
        if (!!this.setNoDelay) {
          socket.setNoDelay(true);
        }
        processTcp(this, this.tcpprocessor, socket, data);
      }
    });
  }

  close() {
    if (this.state !== State.ST_STARTED) {
      return;
    }

    this.state = State.ST_CLOSED;
    this.wsprocessor.close();
    this.tcpprocessor.close();
  }
}
function isHttp(data: any) {
  let head = data.toString("utf8", 0, 4);

  for (let i = 0, l = HTTP_METHODS.length; i < l; i++) {
    if (head.indexOf(HTTP_METHODS[i]) === 0) {
      return true;
    }
  }

  return false;
}

function processHttp(
  switcher: Switcher,
  processor: WSProcessor,
  socket: Socket,
  data: any
) {
  processor.add(socket, data);
}

function processTcp(
  switcher: Switcher,
  processor: TCPProcessor,
  socket: Socket,
  data: any
) {
  processor.add(socket, data);
}

export { Switcher };
