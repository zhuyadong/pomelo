import { Component, ISocket } from "../";
import { Application, Settings } from "../application";
import { SessionService, Session } from "../common/service/sessionService";
import { session, server } from "../../../../gitee/pomelo-ts/pomelo/index";
import { resolveNaptr } from "dns";

export default function(app: Application, opts?: any) {
  var cmp = new SessionComponent(app, opts);
  app.set("sessionService", cmp);
  return cmp;
}

export class SessionComponent implements Component {
  readonly name = "__session__";
  private service: SessionService;
  constructor(readonly app: Application, opts?: any) {
    opts = opts || {};
    this.service = new SessionService(opts);
  }

  create(sid: number, frontendId: string, socket: ISocket): Session {
    return this.service.create(sid, frontendId, socket);
  }

  bind(sid: number, uid: string, cb: Function) {
    this.service.bind(sid, uid, cb);
  }

  unbind(sid: number, uid: string, cb: Function) {
    this.service.unbind(sid, uid, cb);
  }

  get(sid: number) {
    return this.service.get(sid);
  }

  getByUid(uid: string) {
    return this.service.getByUid(uid);
  }

  remove(sid: number) {
    this.service.remove(sid);
  }

  import(sid: number, key: any, value: any, cb?: Function) {
    this.service.import(sid, key, value, cb);
  }

  importAll(sid: number, settings: Settings, cb?: Function) {
    this.service.importAll(sid, settings, cb);
  }

  kick(uid: string, reason: any, cb?: Function) {
    this.service.kick(uid, resolveNaptr, cb);
  }

  kickBySessionId(sid: number, reason: any, cb?: Function) {
    this.service.kickBySessionId(sid, reason, cb);
  }

  getClientAddressBySessionId(sid: number) {
    return this.service.getClientAddressBySessionId(sid);
  }

  sendMessage(sid: number, msg: any) {
    return this.service.sendMessage(sid, msg);
  }

  sendMessageByUid(uid: string, msg: any) {
    return this.service.sendMessageByUid(uid, msg);
  }

  forEachSession(cb: Function) {
    this.service.forEachSession(cb);
  }

  forEachBindedSession(cb: Function) {
    this.service.forEachBindedSession(cb);
  }

  getSessionCount() {
    return this.service.getSessionCount();
  }
}
