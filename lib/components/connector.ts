import { ConnectionComponent } from './connection';
import {
  Component,
  Application,
  Connector,
  ConnectorEncodeFunc,
  ConnectorDecodeFunc,
  BlacklistFunc,
  Blacklist
} from "../application";
import { Session } from "../common/service/sessionService";
import taskManager = require("../common/manager/taskManager");
import { ServerComponent } from "./server";
import { SessionComponent } from "./session";
import { ISocket, events } from "../pomelo";
import { isObject } from "../util/utils";
import pomelo from "../pomelo";
import utils = require("../util/utils");

const rsa = require("node-bignumber");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export default (app: Application, opts?: { connector?: Connector }) => {
  return new ConnectorComponent(app, opts);
};

export interface ConnectorComponentOpts {
  connector?: Connector;
  encode?: ConnectorEncodeFunc;
  decode?: ConnectorDecodeFunc;
  useDict?: boolean;
  useProtobuf?: boolean;
  useCrypto?: boolean;
  useHostFilter?: boolean;
  useAsyncCoder?: boolean;
  blacklistFun?: BlacklistFunc;
}

export class ConnectorComponent implements Component {
  readonly name: string = "__connector__";
  readonly connector: Connector;
  readonly encode: ConnectorEncodeFunc;
  readonly decode: ConnectorDecodeFunc;
  readonly useCrypto: boolean;
  readonly useHostFilter: boolean;
  readonly useAsyncCoder: boolean;
  readonly server: ServerComponent;
  readonly session: SessionComponent;
  readonly connection: ConnectionComponent;
  private blacklistFun: BlacklistFunc;
  readonly keys: { [idx: string]: any };
  private blacklist: Blacklist;
  constructor(readonly app: Application, opts?: ConnectorComponentOpts) {
    opts = opts || {};
    this.connector = getConnector(app, opts);
    this.encode = opts.encode!;
    this.decode = opts.decode!;
    this.useCrypto = opts.useCrypto!;
    this.useHostFilter = opts.useHostFilter!;
    this.useAsyncCoder = opts.useAsyncCoder!;
    this.blacklistFun = opts.blacklistFun!;
    this.keys = {};
    this.blacklist = [];

    if (opts.useDict) {
      app.load(pomelo.dictionary, app.get("dictionaryConfig"));
    }

    if (opts.useProtobuf) {
      app.load(pomelo.protobuf, app.get("protobufConfig"));
    }

    // component dependencies
    this.server = <any>null;
    this.session = <any>null;
    this.connection = <any>null;
  }
  start(cb?: Function) {
    this.server! = this.app.components.__server__;
    this.session! = this.app.components.__session__;
    this.connection! = this.app.components.__connection__;

    // check component dependencies
    if (!this.server) {
      process.nextTick(() => {
        utils.invokeCallback(
          cb!,
          new Error(
            "fail to start connector component for no server component loaded"
          )
        );
      });
      return;
    }

    if (!this.session) {
      process.nextTick(() => {
        utils.invokeCallback(
          cb!,
          new Error(
            "fail to start connector component for no session component loaded"
          )
        );
      });
      return;
    }

    process.nextTick(cb!);
  }

  afterStart(cb?: Function) {
    this.connector.start(cb!);
    this.connector.on("connection", this.hostFilter.bind(this, bindEvents));
  }

  stop(force: boolean, cb: Function) {
    if (this.connector) {
      this.connector.stop(force, cb);
      (<any>this.connector) = null;
      return;
    } else {
      process.nextTick(cb);
    }
  }

  send(
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb: Function
  ) {
    logger.debug(
      "[%s] send message reqId: %s, route: %s, msg: %j, receivers: %j, opts: %j",
      this.app.serverId,
      reqId,
      route,
      msg,
      recvs,
      opts
    );
    if (this.useAsyncCoder) {
      return this.sendAsync(reqId, route, msg, recvs, opts, cb);
    }

    let emsg = msg;
    if (this.encode) {
      // use costumized encode
      emsg = this.encode.call(this, reqId, route, msg);
    } else if (this.connector.encode) {
      // use connector default encode
      emsg = this.connector.encode(reqId, route, msg);
    }

    this.doSend(reqId, route, emsg, recvs, opts, cb);
  }

  sendAsync(
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb: Function
  ) {
    let emsg = msg;

    if (this.encode) {
      // use costumized encode
      this.encode(reqId, route, msg, (err: any, encodeMsg: any) => {
        if (err) {
          return cb(err);
        }

        emsg = encodeMsg;
        this.doSend(reqId, route, emsg, recvs, opts, cb);
      });
    } else if (this.connector.encode) {
      // use connector default encode
      this.connector.encode(reqId, route, msg, (err: any, encodeMsg: any) => {
        if (err) {
          return cb(err);
        }

        emsg = encodeMsg;
        this.doSend(reqId, route, emsg, recvs, opts, cb);
      });
    }
  }

  doSend(
    reqId: number,
    route: string,
    emsg: any,
    recvs: number[],
    opts: any,
    cb: Function
  ) {
    if (!emsg) {
      process.nextTick(() => {
        return (
          cb &&
          cb(new Error("fail to send message for encode result is empty."))
        );
      });
    }

    this.app.components.__pushScheduler__.schedule(
      reqId,
      route,
      emsg,
      recvs,
      opts,
      cb
    );
  }

  setPubKey(id: number, key: any) {
    let pubKey = new rsa.Key();
    pubKey.n = new rsa.BigInteger(key.rsa_n, 16);
    pubKey.e = key.rsa_e;
    this.keys[id] = pubKey;
  }

  getPubKey(id: string) {
    return this.keys[id];
  }

  hostFilter(cb: Function, socket: ISocket) {
    if (!this.useHostFilter) {
      return cb(this, socket);
    }

    let ip = socket.remoteAddress.ip;
    let check = (list: (string | RegExp)[]) => {
      for (let address in list) {
        let exp = new RegExp(list[address]);
        if (exp.test(ip)) {
          socket.disconnect();
          return true;
        }
      }
      return false;
    };
    // dynamical check
    if (this.blacklist.length !== 0 && !!check(this.blacklist)) {
      return;
    }
    // static check
    if (!!this.blacklistFun && typeof this.blacklistFun === "function") {
      this.blacklistFun((err, list) => {
        if (!!err) {
          logger.error("connector blacklist error: %j", err.stack);
          utils.invokeCallback(cb, this, socket);
          return;
        }
        if (!Array.isArray(list)) {
          logger.error("connector blacklist is not array: %j", list);
          utils.invokeCallback(cb, this, socket);
          return;
        }
        if (!!check(list)) {
          return;
        } else {
          utils.invokeCallback(cb, this, socket);
          return;
        }
      });
    } else {
      utils.invokeCallback(cb, this, socket);
    }
  }
}

//FIXME:这里的代码好像根本没有用，没有一个decode函数支持cb的
function handleMessageAsync(
  self: ConnectorComponent,
  msg: any,
  session: Session,
  socket: ISocket
) {
  if (self.decode) {
    self.decode(msg, session, (err: any, dmsg: any) => {
      if (err) {
        logger.error("fail to decode message from client %s .", err.stack);
        return;
      }

      doHandleMessage(self, dmsg, session);
    });
  } else if (self.connector.decode) {
    self.connector.decode(msg, <any>socket, (err: any, dmsg: any) => {
      if (err) {
        logger.error("fail to decode message from client %s .", err.stack);
        return;
      }

      doHandleMessage(self, dmsg, session);
    });
  }
}

function doHandleMessage(self: ConnectorComponent, dmsg: any, session: Session) {
  if (!dmsg) {
    // discard invalid message
    return;
  }

  // use rsa crypto
  if (self.useCrypto) {
    let verified = verifyMessage(self, session, dmsg);
    if (!verified) {
      logger.error("fail to verify the data received from client.");
      return;
    }
  }

  handleMessage(self, session, dmsg);
}

function getSession(self: ConnectorComponent, socket: ISocket) {
  let app = self.app,
    sid = socket.id;
  let session = self.session.get(sid);
  if (session) {
    return session;
  }

  session = self.session.create(sid, app.serverId, socket);
  logger.debug(
    "[%s] getSession session is created with session id: %s",
    app.serverId,
    sid
  );

  // bind events for session
  socket.on("disconnect", session.closed.bind(session));
  socket.on("error", session.closed.bind(session));
  session.on("closed", onSessionClose.bind(null, app));
  session.on("bind", (uid: string) => {
    logger.debug("session on [%s] bind with uid: %s", self.app.serverId, uid);
    // update connection statistics if necessary
    if (self.connection) {
      self.connection.addLoginedUser(uid, {
        loginTime: Date.now(),
        uid: uid,
        address: socket.remoteAddress.ip + ":" + socket.remoteAddress.port
      });
    }
    self.app.event.emit(events.BIND_SESSION, session);
  });

  session.on("unbind", (uid: string) => {
    if (self.connection) {
      self.connection.removeLoginedUser(uid);
    }
    self.app.event.emit(events.UNBIND_SESSION, session);
  });

  return session;
}

function getConnector(app: Application, opts?: any) {
  let connector = opts.connector;
  if (!connector) {
    return getDefaultConnector(app, opts);
  }

  if (typeof connector !== "function") {
    return connector;
  }

  let curServer = app.curServer;
  return new connector(curServer.clientPort, curServer.host, opts);
}

function getDefaultConnector(app: Application, opts?: any) {
  let DefaultConnector = require("../connectors/sioconnector");
  let curServer = app.curServer;
  return new DefaultConnector(curServer.clientPort, curServer.host, opts);
}

function onSessionClose(app: Application, session: Session, reason: any) {
  taskManager.closeQueue(session.id, true);
  app.event.emit(events.CLOSE_SESSION, session);
}

function checkServerType(route: string) {
  if (!route) {
    return null;
  }
  let idx = route.indexOf(".");
  if (idx < 0) {
    return null;
  }
  return route.substring(0, idx);
}

function bindEvents(self: ConnectorComponent, socket: ISocket) {
  let curServer = self.app.curServer;
  let maxConnections = curServer["max-connections"];
  if (self.connection && maxConnections) {
    self.connection.increaseConnectionCount();
    let statisticInfo = self.connection.getStatisticsInfo();
    if (statisticInfo.totalConnCount > maxConnections) {
      logger.warn(
        "the server %s has reached the max connections %s",
        curServer.id,
        maxConnections
      );
      socket.disconnect();
      return;
    }
  }

  //create session for connection
  let session = getSession(self, socket);
  let closed = false;

  socket.on("disconnect", () => {
    if (closed) {
      return;
    }
    closed = true;
    if (self.connection) {
      self.connection.decreaseConnectionCount(session.uid);
    }
  });

  socket.on("error", () => {
    if (closed) {
      return;
    }
    closed = true;
    if (self.connection) {
      self.connection.decreaseConnectionCount(session.uid);
    }
  });

  // new message
  socket.on("message", msg => {
    let dmsg = msg;
    if (self.useAsyncCoder) {
      return handleMessageAsync(self, msg, session, socket);
    }

    if (self.decode) {
      dmsg = self.decode(msg, session);
    } else if (self.connector.decode) {
      dmsg = self.connector.decode(msg, <any>socket);
    }
    if (!dmsg) {
      // discard invalid message
      return;
    }

    // use rsa crypto
    if (self.useCrypto) {
      let verified = verifyMessage(self, session, dmsg);
      if (!verified) {
        logger.error("fail to verify the data received from client.");
        return;
      }
    }

    handleMessage(self, session, dmsg);
  }); //on message end
}

function handleMessage(self: ConnectorComponent, session: Session, msg: any) {
  logger.debug(
    "[%s] handleMessage session id: %s, msg: %j",
    self.app.serverId,
    session.id,
    msg
  );
  let type = checkServerType(msg.route);
  if (!type) {
    logger.error("invalid route string. route : %j", msg.route);
    return;
  }
  self.server.globalHandle(
    msg,
    session.toFrontendSession(),
    (err: any, resp: any, opts: any) => {
      if (resp && !msg.id) {
        logger.warn("try to response to a notify: %j", msg.route);
        return;
      }
      if (!msg.id && !resp) return;
      if (!resp) resp = {};
      if (!!err && !resp.code) {
        resp.code = 500;
      }
      opts = {
        type: "response",
        userOptions: opts || {}
      };
      // for compatiablity
      opts.isResponse = true;

      self.send(msg.id, msg.route, resp, [session.id], opts, () => {});
    }
  );
}

function verifyMessage(self: ConnectorComponent, session: Session, msg: any) {
  let sig = msg.body.__crypto__;
  if (!sig) {
    logger.error(
      "receive data from client has no signature [%s]",
      self.app.serverId
    );
    return false;
  }

  let pubKey;

  if (!session) {
    logger.error("could not find session.");
    return false;
  }

  if (!session.get("pubKey")) {
    pubKey = self.getPubKey(session.id.toString());
    if (!!pubKey) {
      delete self.keys[session.id];
      session.set("pubKey", pubKey);
    } else {
      logger.error("could not get public key, session id is %s", session.id);
      return false;
    }
  } else {
    pubKey = session.get("pubKey");
  }

  if (!pubKey.n || !pubKey.e) {
    logger.error(
      "could not verify message without public key [%s]",
      self.app.serverId
    );
    return false;
  }

  delete msg.body.__crypto__;

  let message = JSON.stringify(msg.body);
  if (utils.hasChineseChar(message)) message = utils.unicodeToUtf8(message);

  return pubKey.verifyString(message, sig);
}
