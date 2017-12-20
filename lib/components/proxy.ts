const crc = require("crc");
import utils = require("../util/utils");
const Client = require("pomelo-rpc").client;
import pathUtil = require("../util/pathUtil");
import { Component, Application, ServerInfo } from "../application";
import { events } from "../index";
import { KEYWORDS, RESERVED } from "../util/constants";
import { Session } from "../common/service/sessionService";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export default function(app: Application, opts?: any) {
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
}

export class ProxyComponent implements Component {
  readonly name = "__proxy__";
  private opts: any;
  private client: any; //TODO
  constructor(readonly app: Application, opts?: any) {
    this.opts = opts;
    this.client = genRpcClient(this.app, opts);
    this.app.event.on(events.ADD_SERVERS, this.addServers.bind(this));
    this.app.event.on(events.REMOVE_SERVERS, this.removeServers.bind(this));
    this.app.event.on(events.REPLACE_SERVERS, this.replaceServers.bind(this));
  }
  start(cb: Function) {
    if (this.opts.enableRpcLog) {
      logger.warn(
        "enableRpcLog is deprecated in 0.8.0, please use app.rpcFilter(pomelo.rpcFilters.rpcLog())"
      );
    }
    let rpcBefores = this.app.get(KEYWORDS.RPC_BEFORE_FILTER);
    let rpcAfters = this.app.get(KEYWORDS.RPC_AFTER_FILTER);
    let rpcErrorHandler = this.app.get(RESERVED.RPC_ERROR_HANDLER);

    if (!!rpcBefores) {
      this.client.before(rpcBefores);
    }
    if (!!rpcAfters) {
      this.client.after(rpcAfters);
    }
    if (!!rpcErrorHandler) {
      this.client.setErrorHandler(rpcErrorHandler);
    }
    process.nextTick(cb);
  }

  afterStart(cb: Function) {
    let self = this;
    (<any>this.app).__defineGetter__("rpc", () => {
      return self.client.proxies.user;
    });
    (<any>this.app).__defineGetter__("sysrpc", () => {
      return self.client.proxies.sys;
    });
    this.app.set("rpcInvoke", this.client.rpcInvoke.bind(this.client));
    this.client.start(cb);
  }

  addServers(servers: ServerInfo[]) {
    if (!servers || !servers.length) {
      return;
    }

    genProxies(this.client, this.app, servers);
    this.client.addServers(servers);
  }

  removeServers(ids: string[]) {
    this.client.removeServers(ids);
  }

  replaceServers(servers: ServerInfo[]) {
    if (!servers || !servers.length) {
      return;
    }

    // update proxies
    this.client.proxies = {};
    genProxies(this.client, this.app, servers);

    this.client.replaceServers(servers);
  }

  rpcInvoke(serverId: string, msg: any, cb: Function) {
    this.client.rpcInvoke(serverId, msg, cb);
  }
}

function genRpcClient(app: Application, opts?: any) {
  opts.context = app;
  opts.routeContext = app;
  if (!!opts.rpcClient) {
    return opts.rpcClient.create(opts);
  } else {
    return Client.create(opts);
  }
}

function genProxies(client: any, app: Application, sinfos: ServerInfo[]) {
  let item;
  for (let i = 0, l = sinfos.length; i < l; i++) {
    item = sinfos[i];
    if (hasProxy(client, item)) {
      continue;
    }
    client.addProxies(getProxyRecords(app, item));
  }
}

function hasProxy(client: any, sinfo: ServerInfo) {
  let proxy = client.proxies;
  return !!proxy.sys && !!proxy.sys[sinfo.serverType];
}

function getProxyRecords(app: Application, sinfo: ServerInfo) {
  let records = [],
    appBase = app.base,
    record;
  // sys remote service path record
  if (app.isFrontend(sinfo)) {
    record = pathUtil.getSysRemotePath("frontend");
  } else {
    record = pathUtil.getSysRemotePath("backend");
  }
  if (record) {
    records.push(pathUtil.remotePathRecord("sys", sinfo.serverType, record));
  }

  // user remote service path record
  record = pathUtil.getUserRemotePath(appBase, sinfo.serverType);
  if (record) {
    records.push(pathUtil.remotePathRecord("user", sinfo.serverType, record));
  }

  return records;
}

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
