import * as process from "process";
import utils = require("./util/utils");
import path = require("path");
import fs = require("fs");
import { FILEPATH, KEYWORDS, RESERVED } from "./util/constants";
import { EventEmitter } from "events";
const Logger = require("pomelo-logger");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

enum State {
  STATE_INITED = 1, // app has inited
  STATE_START = 2, // app start
  STATE_STARTED = 3, // app has started
  STATE_STOPED = 4 // app has stoped
}

export interface ServerInfo {
  id: string;
  host: string;
  port: number;
  serverType: string;
  frontend?: boolean | string;
  clientHost?: string;
  clientPort?: number;
  [idx: string]: any;
}

export type ServerInfoArrayMap = { [idx: string]: ServerInfo[] };
export type ServerInfoMap = { [idx: string]: ServerInfo };
export type ClusterSeqMap = { [idx: string]: number };
export type LifecycleCbs = { [idx: string]: Function };
export type Settings = { [idx: string]: any };
export type ArgsMap = { [idx: string]: string | number };

export interface RPCInvokeFunc {
  (sid: number, msg: any, cb?: Function): void;
}

interface AppComponents {
  __server__: ServerInfo;
}

export class Application {
  readonly event: EventEmitter;
  rpcInvoke: RPCInvokeFunc;

  private _components: AppComponents;
  get components(): Readonly<AppComponents> {
    return this._components;
  }

  get serverId(): string {
    return this.get(RESERVED.SERVER_ID);
  }

  get serverType(): string {
    return this.get(RESERVED.SERVER_TYPE);
  }

  get curServer(): ServerInfo {
    return this.get(RESERVED.CURRENT_SERVER);
  }

  private _startTime: number;
  get startTime(): number {
    return this._startTime;
  }

  private _servers: ServerInfoMap;
  get servers(): Readonly<ServerInfoMap> {
    return this._servers;
  }

  private _serverTypeMaps: ServerInfoArrayMap;
  get serverTypeMaps(): Readonly<ServerInfoArrayMap> {
    return this._serverTypeMaps;
  }

  private _serverTypes: string[];
  get serverTypes(): Readonly<string[]> {
    return this._serverTypes;
  }

  private _lifecycleCbs: LifecycleCbs;
  get lifecycleCbs(): Readonly<LifecycleCbs> {
    return this._lifecycleCbs;
  }

  private _clusterSeq: ClusterSeqMap;
  get clusterSeq(): Readonly<ClusterSeqMap> {
    return this._clusterSeq;
  }

  private _settings: Settings;
  get settings(): Readonly<Settings> {
    return this._settings;
  }

  get master(): ServerInfo {
    return this.get(RESERVED.MASTER);
  }

  get base(): string {
    return this.get(RESERVED.BASE);
  }

  get env(): string {
    return this.get(RESERVED.ENV);
  }

  get main(): string {
    return this.get(RESERVED.MAIN);
  }

  get mode(): string {
    return this.get(RESERVED.MODE);
  }

  get type(): string {
    return this.get(RESERVED.TYPE);
  }

  get startId(): string {
    return this.get(RESERVED.STARTID);
  }

  private static _instance: Application;
  static get instance(): Application {
    if (!Application._instance) {
      Application._instance = new Application();
    }
    return Application._instance;
  }

  private _loaded: any[];
  private _state: State;

  constructor() {
    this.event = new EventEmitter();
    this._loaded = [];
    this._components = {} as AppComponents;
    this._settings = {};
    this._servers = {};
    this._serverTypeMaps = {};
    this._serverTypes = [];
    this._lifecycleCbs = {};
    this._clusterSeq = {};
  }

  init(opts?: any) {
    opts = opts || {};
    var base = opts.base || path.dirname(require.main!.filename);
    this.set(RESERVED.BASE, base);
    this.defaultConfiguration();
    this._state = State.STATE_INITED;
    logger.info("application inited: %j", this.serverId);
  }

  require(ph: string) {
    return require(path.join(this.base, ph));
  }

  configureLogger(logger: any) {
    if (process.env.POMELO_LOGGER !== "off") {
      let base = this.base;
      let env = this.get(RESERVED.ENV);
      let originPath = path.join(base, FILEPATH.LOG);
      let presentPath = path.join(
        base,
        FILEPATH.CONFIG_DIR,
        env,
        path.basename(FILEPATH.LOG)
      );
      if (fs.existsSync(originPath)) {
        logger.configure(originPath, { serverId: this.serverId, base: base });
      } else if (fs.existsSync(presentPath)) {
        logger.configure(presentPath, { serverId: this.serverId, base: base });
      } else {
        logger.error("logger file path configuration is error.");
      }
    }
  }

  filter(filter:Filter) {

  }
  get(key: "rpcInvoke"): RPCInvokeFunc;
  get(key: "master"): ServerInfo;
  get(key: "base"): string;
  get(key: "env"): string;
  get(key: "main"): string;
  get(key: "mode"): string;
  get(key: "type"): string;
  get(key: "serverType"): string;
  get(key: "serverId"): string;
  get(key: "startId"): string;
  get(key: "servers"): ServerInfoArrayMap;
  get(key: string): any;
  /* 如果要给Applicatoin.get加上新的key，可以在需要的地方如下这样merge进入Application:
  import 'path_to/application'
  declare module 'path_to/application' {
    export interface Application {
      get(setting: 'mykey'):SomeType;
    }
  }
  */
  get(setting: string): any {
    return this._settings.get(setting);
  }
  set(setting: string, val: any) {
    this._settings.set(setting, val);
  }

  private loadServers() {
    this.loadConfigBaseApp(RESERVED.SERVERS, FILEPATH.SERVER);
    const servers = this.get(RESERVED.SERVERS) as ServerInfoArrayMap;
    let serverMap: ServerInfoMap = {};
    for (let serverType in servers) {
      let slist = servers[serverType];
      for (let server of slist) {
        server.serverType = serverType;
        if (server[RESERVED.CLUSTER_COUNT]) {
          this.loadCluster(server, serverMap);
          continue;
        }
        serverMap[server.id] = server;
      }
    }
    this.set(KEYWORDS.SERVER_MAP, serverMap);
  }

  private processArgs(args: ArgsMap) {
    let serverType = args.serverType || RESERVED.MASTER;
    let serverId = args.id || this.master.id;
    let mode = args.mode || RESERVED.CLUSTER;
    let masterha = args.masterha || "false";
    let type = args.type || RESERVED.ALL;
    let startId = args.startId;

    this.set(RESERVED.MAIN, args.main);
    this.set(RESERVED.SERVER_TYPE, serverType);
    this.set(RESERVED.SERVER_ID, serverId);
    this.set(RESERVED.MODE, mode);
    this.set(RESERVED.TYPE, type);
    if (!!startId) {
      this.set(RESERVED.STARTID, startId);
    }

    if (masterha === "true") {
      this.set(RESERVED.MASTER, args);
      this.set(RESERVED.CURRENT_SERVER, args);
    } else if (serverType !== RESERVED.MASTER) {
      this.set(RESERVED.CURRENT_SERVER, args);
    } else {
      this.set(RESERVED.CURRENT_SERVER, this.master);
    }
  }

  private configLogger() {
    if (process.env.POMELO_LOGGER !== "off") {
      var env = this.get(RESERVED.ENV);
      var originPath = path.join(this.base, FILEPATH.LOG);
      var presentPath = path.join(
        this.base,
        FILEPATH.CONFIG_DIR,
        env,
        path.basename(FILEPATH.LOG)
      );
      if (fs.existsSync(originPath)) {
        this.logConfigure(originPath);
      } else if (fs.existsSync(presentPath)) {
        this.logConfigure(presentPath);
      } else {
        logger.error("logger file path configuration is error.");
      }
    }
  }

  private loadLifecycle() {
    var filePath = path.join(
      this.base,
      FILEPATH.SERVER_DIR,
      this.serverType,
      FILEPATH.LIFECYCLE
    );
    if (!fs.existsSync(filePath)) {
      return;
    }
    var lifecycle = require(filePath);
    for (var key in lifecycle) {
      if (typeof lifecycle[key] === "function") {
        this._lifecycleCbs[key] = lifecycle[key];
      } else {
        logger.warn("lifecycle.js in %s is error format.", filePath);
      }
    }
  }

  logConfigure(filename: string) {
    Logger.configure(filename, { serverId: this.serverId, base: this.base });
  }

  defaultConfiguration() {
    const args = parseArgs(process.argv);
    this.set(
      RESERVED.ENV,
      args.env || process.env.NODE_ENV || RESERVED.ENV_DEV
    );
    this.loadConfigBaseApp(RESERVED.MASTER, FILEPATH.MASTER);
    this.loadServers();
    this.processArgs(args);
    this.configLogger();
    this.loadLifecycle();
  }

  loadCluster(server: ServerInfo, serverMap: ServerInfoMap) {
    let increaseFields: { [idx: string]: string } = {};
    let host = server.host;
    let count = parseInt(server[RESERVED.CLUSTER_COUNT]);
    let seq = this.clusterSeq[server.serverType];
    if (!seq) {
      seq = 0;
      this._clusterSeq[server.serverType] = count;
    } else {
      this._clusterSeq[server.serverType] = seq + count;
    }

    for (let key in server) {
      let value = server[key].toString();
      if (value.indexOf(RESERVED.CLUSTER_SIGNAL) > 0) {
        let base = server[key].slice(0, -2);
        increaseFields[key] = base;
      }
    }

    let clone = (src: any) => {
      let rs = {} as any;
      for (let key in src) {
        rs[key] = src[key];
      }
      return rs;
    };
    for (let i = 0, l = seq; i < count; i++, l++) {
      let cserver = clone(server);
      cserver.id = RESERVED.CLUSTER_PREFIX + server.serverType + "-" + l;
      for (let k in increaseFields) {
        let v = parseInt(increaseFields[k]);
        cserver[k] = v + i;
      }
      serverMap[cserver.id] = cserver;
    }
  }

  loadConfigBaseApp(key: string, val: string, reload: boolean = false) {
    let env = this.get(RESERVED.ENV);
    let originPath = path.join(this.base, val);
    let presentPath = path.join(
      this.base,
      FILEPATH.CONFIG_DIR,
      env,
      path.basename(val)
    );
    let realPath: string | undefined;
    if (fs.existsSync(originPath)) {
      realPath = originPath;
      let file = require(originPath);
      if (file[env]) {
        file = file[env];
      }
      this.set(key, file);
    } else if (fs.existsSync(presentPath)) {
      realPath = presentPath;
      let pfile = require(presentPath);
      this.set(key, pfile);
    } else {
      logger.error("invalid configuration with file path: %s", key);
    }

    if (!!realPath && !!reload) {
      fs.watch(realPath, (event, filename) => {
        if (event === "change") {
          delete require.cache[require.resolve(realPath!)];
          this.loadConfigBaseApp(key, val);
        }
      });
    }
  }
}

function parseArgs(args: string[]) {
  let argsMap: ArgsMap = {};
  let mainPos = 1;

  while (args[mainPos].indexOf("--") > 0) {
    mainPos++;
  }
  argsMap.main = args[mainPos];

  for (let i = mainPos + 1; i < args.length; i++) {
    let arg = args[i];
    let sep = arg.indexOf("=");
    let key = arg.slice(0, sep);
    let value: string | number = arg.slice(sep + 1);
    if (!isNaN(Number(value)) && value.indexOf(".") < 0) {
      value = Number(value);
    }
    argsMap[key] = value;
  }

  return argsMap;
}
