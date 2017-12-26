import { Application, utils } from "../../index";

export class SessionRemote {
  constructor(readonly app: Application) {}

  bind(sid: number, uid: string, cb: Function) {
    this.app.get("sessionService").bind(sid, uid, cb);
  }

  unbind(sid: number, uid: string, cb: Function) {
    this.app.get("sessionService").unbind(sid, uid, cb);
  }

  push(sid: number, key: any, value: any, cb: Function) {
    this.app.get("sessionService").import(sid, key, value, cb);
  }

  pushAll(sid: number, settings: any, cb: Function) {
    this.app.get("sessionService").importAll(sid, settings, cb);
  }

  getBackendSessionBySid(sid: number, cb: Function) {
    var session = this.app.get("sessionService").get(sid);
    if (!session) {
      utils.invokeCallback(cb);
      return;
    }
    utils.invokeCallback(cb, null, session.toFrontendSession().export());
  }

  getBackendSessionsByUid(uid: string, cb: Function) {
    var sessions = this.app.get("sessionService").getByUid(uid);
    if (!sessions) {
      utils.invokeCallback(cb);
      return;
    }

    var res = [];
    for (var i = 0, l = sessions.length; i < l; i++) {
      res.push(sessions[i].toFrontendSession().export());
    }
    utils.invokeCallback(cb, null, res);
  }

  kickBySid(sid: number, reason: any, cb: Function) {
    this.app.get("sessionService").kickBySessionId(sid, reason, cb);
  }

  kickByUid(uid: string, reason: any, cb: Function) {
    this.app.get("sessionService").kick(uid, reason, cb);
  }
}
