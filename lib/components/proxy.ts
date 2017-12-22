import { Application, Session, ProxyComponent, utils } from "../index";
const crc = require("crc");

export = (app: Application, opts?: any) => {
  opts = opts || {};
  // proxy default config
  // cacheMsg is deprecated, just for compatibility here.
  opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
  opts.interval = opts.interval || 30;
  opts.router = genRouteFun();
  opts.context = app;
  opts.routeContext = app;
  if (app.enabled("rpcDebugLog")) {
    opts.rpcDebugLog = true;
    opts.rpcLogger = require("pomelo-logger").getLogger(
      "rpc-debug",
      __filename
    );
  }

  return new ProxyComponent(app, opts);
};

function genRouteFun() {
  return (session: Session, msg: any, app: Application, cb: Function) => {
    let routes = app.get("__routes__");

    if (!routes) {
      defaultRoute(session, msg, app, cb);
      return;
    }

    let type = msg.serverType,
      route = routes[type] || routes["default"];

    if (route) {
      route(session, msg, app, cb);
    } else {
      defaultRoute(session, msg, app, cb);
    }
  };
}

function defaultRoute(
  session: Session,
  msg: any,
  app: Application,
  cb: Function
) {
  let list = app.getServersByType(msg.serverType);
  if (!list || !list.length) {
    cb(new Error("can not find server info for type:" + msg.serverType));
    return;
  }

  let uid = session ? session.uid || "" : "";
  let index = Math.abs(crc.crc32(uid.toString())) % list.length;
  utils.invokeCallback(cb, null, list[index].id);
}
