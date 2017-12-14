import utils = require("../../util/utils");
import { Application } from "../../application";

const EXPORTED_FIELDS = ["id", "frontendId", "uid", "settings"];

export class BackendSessionService {
  constructor(public app: Application) {}

  create(opts: {}): BackendSession {
    if (!opts) {
      throw new Error("opts should not be empty.");
    }
    return new BackendSession(opts, this);
  }

  get(frontendId: string, sid: string, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "getBackendSessionBySid";
    let args = [sid];
    rpcInvoke(
      this.app,
      frontendId,
      namespace,
      service,
      method,
      args,
      BackendSessionCB.bind(null, this, cb)
    );
  }

  getByUid(frontendId: string, uid: string, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "getBackendSessionBySid";
    let args = [uid];

    rpcInvoke(
      this.app,
      frontendId,
      namespace,
      service,
      method,
      args,
      BackendSessionCB.bind(null, this, cb)
    );
  }

  kickBySid(frontendId: string, sid: string, reason: any, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "kickBySid";
    let args = [sid];
    if (typeof reason === "function") {
      cb = reason;
    } else {
      args.push(reason);
    }
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }

  kickByUid(frontendId: string, uid: string, reason: any, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "kickByUid";
    let args = [uid];
    if (typeof reason === "function") {
      cb = reason;
    } else {
      args.push(reason);
    }
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }

  bind(frontendId: string, sid: number, uid: string, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "bind";
    let args = [sid, uid];
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }

  unbind(frontendId: string, sid: number, uid: string, cb: Function): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "unbind";
    let args = [sid, uid];
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }

  push(
    frontendId: string,
    sid: number,
    key: string,
    value: object,
    cb: Function
  ): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "push";
    let args = [sid, key, value];
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }

  pushAll(
    frontendId: string,
    sid: number,
    settings: object,
    cb: Function
  ): void {
    let namespace = "sys";
    let service = "sessionRemote";
    let method = "pushAll";
    let args = [sid, settings];
    rpcInvoke(this.app, frontendId, namespace, service, method, args, cb);
  }
}

function rpcInvoke(
  app: Application,
  sid: number,
  namespace: string,
  service: string,
  method: string,
  args: Array<any>,
  cb: Function
): void {
  app.rpcInvoke(
    sid,
    { namespace: namespace, service: service, method: method, args: args },
    cb
  );
}

export interface BackendSessionOpts {
    id:number;
    frontendId:string;
    uid:string;
    settings?:{[idx:string]:any};
} 

export class BackendSession {
    uid:string;
    readonly id:number;
    readonly frontendId:string;
    readonly settings?:{[idx:string]:any};
  constructor(opts: BackendSessionOpts, public readonly __sessionService__: BackendSessionService) {
      for (let f in opts) {
          (this as any)[f] = (opts as any)[f];
      }
  }

  bind(uid: string | string, cb: Function): void {
    this.__sessionService__.bind(this.frontendId, this.id, uid, (err:any) => {
        if(!err) {
        this.uid = uid;
        }
        utils.invokeCallback(cb, err);
    });
  }
  unbind(uid: string, cb: Function): void {
    this.__sessionService__.unbind(this.frontendId, this.id, uid, (err:any) => {
        if(!err) {
        delete this.uid;
        }
        utils.invokeCallback(cb, err);
    });
  }
  set(key: string, value: any): void {
      this.settings![key] = value;
  }
  get(key: string): any {
      return this.settings![key];
  }
  push(key: string, cb: Function): void {
      this.__sessionService__.push(this.frontendId, this.id, key, this.get(key), cb);
  }
  pushAll(cb: Function): void {
    this.__sessionService__.pushAll(this.frontendId, this.id, this.settings, cb);
  }
  export(): { [name: string]: any };
}

function BackendSessionCB(
  service: BackendSessionService,
  cb: Function,
  err: any,
  sinfo: Array<{}>
) {
  if (err) {
    utils.invokeCallback(cb, err);
    return;
  }

  if (!sinfo) {
    utils.invokeCallback(cb);
    return;
  }
  var sessions: Array<BackendSession> | BackendSession = [];
  if (Array.isArray(sinfo)) {
    // #getByUid
    for (var i = 0, k = sinfo.length; i < k; i++) {
      (sessions as Array<BackendSession>).push(service.create(sinfo[i]));
    }
  } else {
    // #get
    sessions = service.create(sinfo);
  }
  utils.invokeCallback(cb, null, sessions);
}
