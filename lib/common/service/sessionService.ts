import { isObject } from "util";
import { EventEmitter } from "events";
import { ISocket, Settings } from "../../index";
import { invokeCallback, size } from "../../util/utils";

const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export type SidSessionMap = { [idx: string]: Session };
export type UidSessionsMap = { [idx: string]: Session[] };

const FRONTEND_SESSION_FIELDS = ["id", "frontendId", "uid", "sessionService"];
const EXPORTED_SESSION_FIELDS = ["id", "frontendId", "uid", "settings"];

enum State {
  ST_INITED = 0,
  ST_CLOSED = 1
}

export class Session extends EventEmitter {
  __timeout__?: number;
  protected _state: State;
  protected _settings: Settings;
  protected _uid: string;
  constructor(
    public readonly id: number,
    public readonly frontendId: string,
    protected _socket: ISocket,
    protected _sessionService: SessionService
  ) {
    super();
    this._state = State.ST_INITED;
    this._settings = {};
  }
  get uid() {
    return this._uid;
  }
  set uid(val: string) {
    this._uid = val;
  }

  get socket() {
    return this._socket;
  }
  get sessionService() {
    return this._sessionService;
  }
  set sessionService(val: SessionService) {
    this._sessionService = val;
  }
  get settings(): Readonly<Settings> {
    return this._settings;
  }

  toFrontendSession() {
    return new FrontendSession(this);
  }

  bind(uid: string) {
    this._uid = uid;
    this.emit("bind", uid);
  }

  unbind(uid: string) {
    delete this._uid;
    this.emit("unbind", uid);
  }

  set(key: any, val?: any) {
    if (isObject(key)) {
      for (let i in key) {
        this._settings[i] = key[i];
      }
    } else {
      this._settings[key] = val;
    }
  }

  get(key: any) {
    return this._settings[key];
  }

  send(msg: any) {
    this._socket.send(msg);
  }

  sendBatch(msgs: ArrayLike<any>) {
    this._socket.sendBatch(msgs);
  }

  closed(reason: any) {
    logger.debug(
      "session on [%s] is closed with session id: %s",
      this.frontendId,
      this.id
    );
    if (this._state === State.ST_CLOSED) {
      return;
    }
    this._state = State.ST_CLOSED;
    this._sessionService.remove(this.id);
    this.emit("closed", this.toFrontendSession(), reason);
    this._socket.emit("closing", reason);

    let self = this;
    // give a chance to send disconnect message to client

    process.nextTick(() => {
      self._socket.disconnect();
    });
  }
}

export class FrontendSession extends Session {
  constructor(protected _session: Session) {
    super(
      _session.id,
      _session.frontendId,
      _session.socket,
      _session.sessionService
    );
    clone(_session, this, FRONTEND_SESSION_FIELDS);
    this._settings = dclone(_session.settings);
  }

  bind(uid: string, cb?: Function) {
    this._sessionService.bind(this.id, uid, (err: any) => {
      if (!err) {
        this._uid = uid;
      }
      invokeCallback(cb!, err);
    });
  }

  unbind(uid: string, cb?: Function) {
    this._sessionService.unbind(this.id, uid, (err: any) => {
      if (!err) {
        delete this._uid;
      }
      invokeCallback(cb!, err);
    });
  }

  push(key: any, cb?: Function) {
    this._sessionService.import(this.id, key, this.get(key), cb);
  }

  pushAll(cb?: Function) {
    this._sessionService.importAll(this.id, this._settings, cb);
  }

  on(event: string | symbol, listener: (...args: any[]) => void) {
    EventEmitter.prototype.on.call(this, event, listener);
    this._session.on(event, listener);
    return this;
  }

  export() {
    let res: {
      id: number;
      frontendId: string;
      uid: string;
      settings: Settings;
    } = <any>{};
    clone(this, res, EXPORTED_SESSION_FIELDS);
    return res;
  }
}

export class SessionService {
  private _singleSession = false;
  private _sessions: SidSessionMap;
  private _uidMap: UidSessionsMap;
  get singleSession() {
    return this._singleSession;
  }
  constructor(opts?: any) {
    opts = opts || {};
    this._singleSession = opts.singleSession;
    this._sessions = {}; // sid -> session
    this._uidMap = {}; // uid -> sessions
  }

  get sessions(): Readonly<SidSessionMap> {
    return this._sessions;
  }
  get uidMap(): Readonly<UidSessionsMap> {
    return this._uidMap;
  }

  create(sid: number, frontendId: string, socket: ISocket): Session {
    let session = new Session(sid, frontendId, socket, this);
    this._sessions[session.id] = session;
    return session;
  }

  bind(sid: number, uid: string, cb: Function) {
    const session = this._sessions[sid];

    if (!session) {
      process.nextTick(() => {
        cb(new Error("session does not exist, sid: " + sid));
      });
      return;
    }

    if (session.uid) {
      if (session.uid === uid) {
        // already bound with the same uid
        cb();
        return;
      }

      // already bound with other uid
      process.nextTick(() => {
        cb(new Error("session has already bind with " + session.uid));
      });
      return;
    }

    let sessions = this.uidMap[uid];

    if (this.singleSession && !!sessions) {
      process.nextTick(() => {
        cb(
          new Error(
            "singleSession is enabled, and session has already bind with uid: " +
              uid
          )
        );
      });
      return;
    }

    if (!sessions) {
      sessions = this._uidMap[uid] = [];
    }

    for (let i = 0, l = sessions.length; i < l; i++) {
      // session has binded with the uid
      if (sessions[i].id === session.id) {
        process.nextTick(cb);
        return;
      }
    }
    sessions.push(session);

    session.bind(uid);

    if (cb) {
      process.nextTick(cb);
    }
  }

  unbind(sid: number, uid: string, cb: Function) {
    const session = this.sessions[sid];

    if (!session) {
      process.nextTick(() => {
        cb(new Error("session does not exist, sid: " + sid));
      });
      return;
    }

    if (!session.uid || session.uid !== uid) {
      process.nextTick(() => {
        cb(new Error("session has not bind with " + session.uid));
      });
      return;
    }

    let sessions = this._uidMap[uid];
    let sess: Session;
    if (sessions) {
      for (let i = 0, l = sessions.length; i < l; i++) {
        sess = sessions[i];
        if (sess.id === sid) {
          sessions.splice(i, 1);
          break;
        }
      }

      if (sessions.length === 0) {
        delete this._uidMap[uid];
      }
    }
    session.unbind(uid);

    if (cb) {
      process.nextTick(cb);
    }
  }

  get(sid: number) {
    return this._sessions[sid];
  }

  getByUid(uid: string) {
    return this._uidMap[uid];
  }

  remove(sid: number) {
    const session = this._sessions[sid];
    if (session) {
      let uid = session.uid;
      delete this._sessions[session.id];

      let sessions = this._uidMap[uid];
      if (!sessions) {
        return;
      }

      for (let i = 0, l = sessions.length; i < l; i++) {
        if (sessions[i].id === sid) {
          sessions.splice(i, 1);
          if (sessions.length === 0) {
            delete this._uidMap[uid];
          }
          break;
        }
      }
    }
  }

  import(sid: number, key: any, value: any, cb?: Function) {
    const session = this.sessions[sid];
    if (!session) {
      invokeCallback(cb!, new Error("session does not exist, sid: " + sid));
      return;
    }
    session.set(key, value);
    invokeCallback(cb!);
  }

  importAll(sid: number, settings: Settings, cb?: Function) {
    let session = this.sessions[sid];
    if (!session) {
      invokeCallback(cb!, new Error("session does not exist, sid: " + sid));
      return;
    }

    for (let f in settings) {
      session.set(f, settings[f]);
    }
    invokeCallback(cb!);
  }

  kick(uid: string, reason: any, cb?: Function) {
    if (typeof reason === "function") {
      cb = reason;
      reason = "kick";
    }
    let sessions = this.getByUid(uid);

    if (sessions) {
      // notify client
      let sids: number[] = [];
      sessions.forEach(session => {
        sids.push(session.id);
      });

      sids.forEach(sid => {
        this._sessions[sid].closed(reason);
      });

      process.nextTick(() => {
        invokeCallback(cb!);
      });
    } else {
      process.nextTick(() => {
        invokeCallback(cb!);
      });
    }
  }

  kickBySessionId(sid: number, reason: any, cb?: Function) {
    if (typeof reason === "function") {
      cb = reason;
      reason = "kick";
    }

    let session = this.get(sid);

    if (session) {
      // notify client
      session.closed(reason);
      process.nextTick(() => {
        invokeCallback(cb!);
      });
    } else {
      process.nextTick(() => {
        invokeCallback(cb!);
      });
    }
  }

  getClientAddressBySessionId(sid: number) {
    let session = this.get(sid);
    if (session) {
      let socket = session.socket;
      return socket.remoteAddress;
    } else {
      return null;
    }
  }

  sendMessage(sid: number, msg: any) {
    let session = this.get(sid);

    if (!session) {
      logger.debug(
        "Fail to send message for non-existing session, sid: " +
          sid +
          " msg: " +
          msg
      );
      return false;
    }

    session.send(msg);
    return true;
  }

  sendMessageByUid(uid: string, msg: any) {
    let sessions = this.getByUid(uid);

    if (!sessions) {
      logger.debug(
        "fail to send message by uid for non-existing session. uid: %j",
        uid
      );
      return false;
    }

    for (let i = 0, l = sessions.length; i < l; i++) {
      sessions[i].send(msg);
    }

    return true;
  }

  forEachSession(cb: Function) {
    for (let sid in this.sessions) {
      cb(this.sessions[sid]);
    }
  }

  forEachBindedSession(cb: Function) {
    for (let uid in this.uidMap) {
      let sessions = this.uidMap[uid];
      for (let i = 0, l = sessions.length; i < l; i++) {
        cb(sessions[i]);
      }
    }
  }

  getSessionCount() {
    return size(this.sessions);
  }
}

function clone(src: any, dest: any, includes: string[]) {
  let f;
  for (let i = 0, l = includes.length; i < l; i++) {
    f = includes[i];
    dest[f] = src[f];
  }
}

function dclone(src: any): any {
  let res = {};
  for (let f in src) {
    (<any>res)[f] = src[f];
  }
  return res;
}
