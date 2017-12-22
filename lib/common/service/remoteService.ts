import { Component, Application, pathUtil } from "../../index";
import fs = require("fs");
const RemoteServer = require("pomelo-rpc").server;

export class RemoteComponent implements Component {
  readonly name = "__remote__";
  private remote: any; //TODO
  constructor(readonly app: Application, private opts: any) {
    this.app = app;
    this.opts = opts;
  }
  start(cb: Function) {
    this.opts.port = this.app.curServer.port;
    this.remote = genRemote(this.app, this.opts);
    this.remote.start();
    process.nextTick(cb);
  }

  stop(force: boolean, cb: Function) {
    this.remote.stop(force);
    process.nextTick(cb);
  }
}

function getRemotePaths(app: Application) {
  let paths = [];

  let role;
  // master server should not come here
  if (app.isFrontend()) {
    role = "frontend";
  } else {
    role = "backend";
  }

  let sysPath = pathUtil.getSysRemotePath(role),
    serverType = app.serverType;
  if (fs.existsSync(sysPath!)) {
    paths.push(pathUtil.remotePathRecord("sys", serverType, sysPath!));
  }
  let userPath = pathUtil.getUserRemotePath(app.base, serverType);
  if (fs.existsSync(userPath!)) {
    paths.push(pathUtil.remotePathRecord("user", serverType, userPath!));
  }

  return paths;
}

function genRemote(app: Application, opts?: any) {
  opts.paths = getRemotePaths(app);
  opts.context = app;
  if (!!opts.rpcServer) {
    return opts.rpcServer.create(opts);
  } else {
    return RemoteServer.create(opts);
  }
}
