import {
  Component,
  Application,
  events,
  KEYWORDS,
  RESERVED,
  ServerInfo,
  pathUtil
} from "../../index";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const Client = require("pomelo-rpc").client;

export class ProxyComponent implements Component {
  readonly name = "__proxy__";
  private opts: any;
  private client: any; //TODO
  constructor(readonly app: Application, opts: any) {
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

function genRpcClient(app: Application, opts: any) {
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
