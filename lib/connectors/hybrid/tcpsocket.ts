import util = require("util");
import { Stream } from "stream";
import { Socket, SocketConstructorOpts } from "net";
import { headHandler } from "../../util/utils";
const protocol = require("pomelo-protocol");
const Package = protocol.Package;
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

enum State {
  ST_HEAD = 1, // wait for head
  ST_BODY = 2, // wait for body
  ST_CLOSED = 3 // closed
}

export interface TcpSocketOpts {
  headSize: number;
  headHandler: (buf: Buffer) => number;
  closeMethod: string;
}

export default class TcpSocket extends Stream {
  private writeable: boolean;
  readonly _socket: Socket;
  readonly headSize: number;
  readonly closeMethod: string;
  readonly headBuffer: Buffer;
  readonly headHandler: (buf: Buffer) => number;
  readonly headOffset: number;
  readonly packageOffset: number;
  readonly packageSize: number;
  readonly packageBuffer: Buffer;
  readonly state: State;
  constructor(socket: Socket, opts: TcpSocketOpts) {
    super();
    if (!(this instanceof Socket)) {
      return new TcpSocket(socket, opts);
    }

    if (!socket || !opts) {
      throw new Error("invalid socket or opts");
    }

    if (!opts.headSize || typeof opts.headHandler !== "function") {
      throw new Error("invalid opts.headSize or opts.headHandler");
    }

    // stream style interfaces.
    // TODO: need to port to stream2 after node 0.9
    Stream.call(this);
    this.readable = true;
    this.writeable = true;

    this._socket = socket;
    this.headSize = opts.headSize;
    this.closeMethod = opts.closeMethod;
    this.headBuffer = new Buffer(opts.headSize);
    this.headHandler = opts.headHandler;

    this.headOffset = 0;
    this.packageOffset = 0;
    this.packageSize = 0;
    this.packageBuffer = <any>null;

    // bind event form the origin socket
    this._socket.on("data", ondata.bind(null, this));
    this._socket.on("end", onend.bind(null, this));
    this._socket.on("error", this.emit.bind(this, "error"));
    this._socket.on("close", this.emit.bind(this, "close"));

    this.state = State.ST_HEAD;
  }
  send(msg: string, encode?: string, cb?: Function) {
    return this._socket.write(msg, encode, cb);
  }

  close() {
    if (!!this.closeMethod && this.closeMethod === "end") {
      this._socket.end();
    } else {
      try {
        this._socket.destroy();
      } catch (e) {
        logger.error("socket close with destroy error: %j", e.stack);
      }
    }
  }
}

function ondata(socket: TcpSocket, chunk: string | Buffer) {
  if (socket.state === State.ST_CLOSED) {
    throw new Error("socket has closed");
  }

  if (typeof chunk !== "string" && !Buffer.isBuffer(chunk)) {
    throw new Error("invalid data");
  }

  if (typeof chunk === "string") {
    chunk = new Buffer(chunk, "utf8");
  }

  let offset = 0,
    end = chunk.length;

  while (offset < end) {
    if (socket.state === State.ST_HEAD) {
      offset = readHead(socket, chunk, offset);
    }

    if (socket.state === State.ST_BODY) {
      offset = readBody(socket, chunk, offset);
    }
  }

  return true;
}

function onend(socket: TcpSocket, chunk: any) {
  if (chunk) {
    socket._socket.write(chunk);
  }

  socket.state! = State.ST_CLOSED;
  reset(socket);
  socket.emit("end");
}

function readHead(socket: TcpSocket, data: any, offset: number) {
  let hlen = socket.headSize - socket.headOffset;
  let dlen = data.length - offset;
  let len = Math.min(hlen, dlen);
  let dend = offset + len;

  data.copy(socket.headBuffer, socket.headOffset, offset, dend);
  socket.headOffset! += len;

  if (socket.headOffset === socket.headSize) {
    // if head segment finished
    let size = socket.headHandler(socket.headBuffer);
    if (size < 0) {
      throw new Error("invalid body size: " + size);
    }
    // check if header contains a valid type
    if (checkTypeData(socket.headBuffer[0])) {
      socket.packageSize! = size + socket.headSize;
      socket.packageBuffer! = new Buffer(socket.packageSize);
      socket.headBuffer.copy(socket.packageBuffer, 0, 0, socket.headSize);
      socket.packageOffset! = socket.headSize;
      socket.state! = State.ST_BODY;
    } else {
      dend = data.length;
      logger.error(
        "close the connection with invalid head message, the remote ip is %s && port is %s && message is %j",
        socket._socket.remoteAddress,
        socket._socket.remotePort,
        data
      );
      socket.close();
    }
  }

  return dend;
}

function readBody(socket: TcpSocket, data: any, offset: number) {
  let blen = socket.packageSize - socket.packageOffset;
  let dlen = data.length - offset;
  let len = Math.min(blen, dlen);
  let dend = offset + len;

  data.copy(socket.packageBuffer, socket.packageOffset, offset, dend);

  socket.packageOffset! += len;

  if (socket.packageOffset === socket.packageSize) {
    // if all the package finished
    let buffer = socket.packageBuffer;
    socket.emit("message", buffer);
    reset(socket);
  }

  return dend;
}

function reset(socket: TcpSocket) {
  socket.headOffset! = 0;
  socket.packageOffset! = 0;
  socket.packageSize! = 0;
  socket.packageBuffer! = <any>null;
  socket.state! = State.ST_HEAD;
}

function checkTypeData(data: any) {
  return (
    data === Package.TYPE_HANDSHAKE ||
    data === Package.TYPE_HANDSHAKE_ACK ||
    data === Package.TYPE_HEARTBEAT ||
    data === Package.TYPE_DATA ||
    data === Package.TYPE_KICK
  );
}

export { TcpSocket };
