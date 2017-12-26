import process = require("process");
import path = require("path");
import fs = require("fs");
import { EventEmitter } from "events";
import { Session, SessionService } from "./common/service/sessionService";
import { events } from "./pomelo";
import { invokeCallback } from "./util/utils";
import { runServers } from "./master/starter";
import { ChannelService } from "./common/service/channelService";
import { watch } from "fs";
import appManager = require("./common/manager/appManager");
import {
  BackendSessionService,
  ConnectionComponent,
  ConnectorComponent,
  DictionaryComponent,
  MasterComponent,
  MonitorComponent,
  ProtobufComponent,
  ProxyComponent,
  PushSchedulerComponent,
  RemoteComponent,
  ServerComponent,
  SessionComponent,
  FILEPATH,
  KEYWORDS,
  RESERVED,
  LIFECYCLE,
  DIR,
  TIME,
  FrontendSession
} from "./index";
import { BackendSession } from "../index";
const async = require("async");
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
  cpu?: number;
  [idx: string]: any;
}

export interface Module {
  moduleId: string;
  start(cb?: Function): void;
}

export interface ModuleConstructor {
  (...args: any[]): Module;
}

export interface ModuleInfo {
  moduleId: string;
  module: Module | ModuleConstructor;
  opts: any;
}

export type ModuleInfoMap = { [idx: string]: ModuleInfo };

export type ServerInfoArrayMap = { [idx: string]: ServerInfo[] };
export type ServerInfoMap = { [idx: string]: ServerInfo };
export type ClusterSeqMap = { [idx: string]: number };
export type LifecycleCbs = { [idx: string]: Function };
export type Settings = { [idx: string]: any };
export type ArgsMap = { [idx: string]: string | number };
export type CallbackMap = { [idx: string]: (cb: Function) => void };
export type FunctionMap = { [idx: string]: Function };

export interface RPCInvokeFunc {
  (serverId: string, msg: any, cb?: Function): void;
}

export type BeforeFilterFunc = (
  msg: any,
  session: FrontendSession,
  next: Function
) => void;
export type AfterFilterFunc = (
  err: any,
  msg: any,
  session: FrontendSession,
  resp: any,
  next: Function
) => void;

export interface Filter {
  before(msg: any, session: FrontendSession, next: Function): void;
  after(err: any, msg: any, session: FrontendSession, resp: any, next: Function): void;
}
export interface RPCFilter {
  before(serverId: string, msg: any, opts: any, next: Function): void;
  after(serverId: string, msg: any, opts: any, next: Function): void;
}

export interface Cron {
  id: number;
  time: string;
  action: string;
}

export interface Component {
  readonly name: string;
  readonly app?: Application;
}

export interface Scheduler {
  start?(cb?: Function): void;
  stop?(cb?: Function): void;
  schedule(
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb?: Function
  ): void;
}
export interface SchedulerConstructor {
  (...args: any[]): Scheduler;
}

export type SchedulerMap = { [idx: string]: Scheduler };

export interface Connector extends EventEmitter {
  //new (port: number, host: string, opts?:any): T;
  start(cb: Function): void;
  stop(force: boolean, cb: Function): void;
  close?(): void;
  encode(reqId: number, route: string, msg: any, cb?: Function): any;
  decode(msg: any, session: Session, cb?: Function): any;
}

export type ConnectorEncodeFunc = (
  reqId: number,
  route: string,
  msg: any,
  cb?: Function
) => any;
export type ConnectorDecodeFunc = (
  msg: any,
  session: Session,
  cb?: Function
) => any;
export type Blacklist = (RegExp | string)[];
export type BlacklistFunc = (cb: (err: any, list: Blacklist) => void) => void;

export interface AppComponents {
  __backendSession__: BackendSessionService;
  __channel__: ChannelService;
  __connection__: ConnectionComponent;
  __connector__: ConnectorComponent;
  __dictionary__: DictionaryComponent;
  __master__: MasterComponent;
  __monitor__: MonitorComponent;
  __protobuf__: ProtobufComponent;
  __proxy__: ProxyComponent;
  __pushScheduler__: PushSchedulerComponent;
  __remote__: RemoteComponent;
  __server__: ServerComponent;
  __session__: SessionComponent;
  [idx: string]: Component;
}

export default class Application {
  readonly event: EventEmitter;
  sysrpc: any; //TODO:pomelo-rpc

  private _components: AppComponents;
  private _stopTimer: any;
  get components(): Readonly<AppComponents> {
    return this._components;
  }

  get serverId(): string {
    return this.get(RESERVED.SERVER_ID);
  }

  getServerId() {
    return this.serverId;
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

  get serversFromConfig(): ServerInfoMap {
    return this.get(KEYWORDS.SERVER_MAP);
  }

  getServersFromConfig() {
    return this.serversFromConfig;
  }

  get backendSessionService() {
    return this.get("backendSessionService");
  }

  get channelService() {
    return this.get("channelService");
  }

  get rpcInvoke() {
    return this.get("rpcInvoke"); //TODO
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
    let base = opts.base || path.dirname(require.main!.filename);
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

  filter(filter: Filter) {
    this.before(filter);
    this.after(filter);
  }

  before(bf: Filter) {
    addFilter(this, KEYWORDS.BEFORE_FILTER, bf);
  }

  after(af: Filter) {
    addFilter(this, KEYWORDS.AFTER_FILTER, af);
  }

  globalFilter(filter: Filter) {
    this.globalBefore(filter);
    this.globalAfter(filter);
  }

  globalBefore(bf: Filter) {
    addFilter(this, KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
  }

  globalAfter(af: Filter) {
    addFilter(this, KEYWORDS.GLOBAL_AFTER_FILTER, af);
  }

  rpcBefore(bf: RPCFilter) {
    addFilter(this, KEYWORDS.RPC_BEFORE_FILTER, bf);
  }

  rpcAfter(af: RPCFilter) {
    addFilter(this, KEYWORDS.RPC_AFTER_FILTER, af);
  }

  rpcFilter(filter: RPCFilter) {
    this.rpcBefore(filter);
    this.rpcAfter(filter);
  }

  load(component: Component | Function, opts?: {}) {
    let name: string = <any>null;
    if (typeof component === "function") {
      component = component(this, opts);
    }

    if (!name && typeof component.name === "string") {
      name = component.name;
    }

    if (name && this.components[name]) {
      // ignore duplicat component
      logger.warn("ignore duplicate component: %j", name);
      return;
    }

    this._loaded.push(component);
    if (name) {
      // components with a name would get by name throught app.components later.
      this._components[name] = component;
    }

    return this;
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

  loadConfig(key: string, val: string) {
    let env = this.get(RESERVED.ENV);
    let mod = require(val);
    if (mod[env]) {
      mod = mod[env];
    }
    this.set(key, mod);
  }

  route(serverType: string, routeFunc: Function) {
    let routes = this.get(KEYWORDS.ROUTE);
    if (!routes) {
      routes = {};
      this.set(KEYWORDS.ROUTE, routes);
    }
    routes[serverType] = routeFunc;
    return this;
  }

  start(cb?: Function) {
    this._startTime = Date.now();
    if (this._state > State.STATE_INITED) {
      invokeCallback(cb!, new Error("application has already start."));
      return;
    }

    this.startByType(() => {
      this.loadDefaultComponents();
      let startUp = () => {
        this.optComponents(this._loaded, RESERVED.START, (err: any) => {
          this._state = State.STATE_START;
          if (err) {
            invokeCallback(cb!, err);
          } else {
            logger.info("%j enter after start...", this.serverId);
            this.afterStart(cb!);
          }
        });
      };
      let beforeFun = this.lifecycleCbs[LIFECYCLE.BEFORE_STARTUP];
      if (!!beforeFun) {
        beforeFun.call(null, this, startUp);
      } else {
        startUp();
      }
    });
  }

  afterStart(cb: Function) {
    if (this._state !== State.STATE_START) {
      invokeCallback(cb, new Error("application is not running now."));
      return;
    }

    let afterFun = this.lifecycleCbs[LIFECYCLE.AFTER_STARTUP];
    this.optComponents(this._loaded, RESERVED.AFTER_START, (err: any) => {
      this._state = State.STATE_STARTED;
      let id = this.serverId;
      if (!err) {
        logger.info("%j finish start", id);
      }
      if (!!afterFun) {
        afterFun.call(null, this, function() {
          invokeCallback(cb, err);
        });
      } else {
        invokeCallback(cb, err);
      }
      let usedTime = Date.now() - this.startTime;
      logger.info("%j startup in %s ms", id, usedTime);
      this.event.emit(events.START_SERVER, id);
    });
  }

  stop(force?: boolean) {
    if (this._state > State.STATE_STARTED) {
      logger.warn("[pomelo application] application is not running now.");
      return;
    }
    this._state = State.STATE_STOPED;
    let self = this;

    this._stopTimer = setTimeout(() => {
      process.exit(0);
    }, TIME.TIME_WAIT_STOP);

    let cancelShutDownTimer = () => {
      if (!!self._stopTimer) {
        clearTimeout(self._stopTimer);
      }
    };
    let shutDown = () => {
      this.stopComps(self._loaded, 0, force!, () => {
        cancelShutDownTimer();
        if (force) {
          process.exit(0);
        }
      });
    };
    let fun = this.get(KEYWORDS.BEFORE_STOP_HOOK);
    let stopFun = this.lifecycleCbs[LIFECYCLE.BEFORE_SHUTDOWN];
    if (!!stopFun) {
      stopFun.call(null, this, shutDown, cancelShutDownTimer);
    } else if (!!fun) {
      invokeCallback(fun, self, shutDown, cancelShutDownTimer);
    } else {
      shutDown();
    }
  }

  set(setting: string, val: any) {
    this._settings[setting] = val;
    return this;
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
  get(key: "channelService"): ChannelService;
  get(key: "backendSessionService"): BackendSessionService;
  get(key: "__modules__"): ModuleInfoMap;
  get(key: "sessionService"): SessionService;
  get(key: string): any;
  /* 如果要给Applicatoin.get加上新的key，可以在需要的地方如下这样merge进入Application:
  import 'path_to/application'
import { ChannelService } from './common/service/channelService';
import { SessionComponent } from '../../../gitee/pomelo-ts/pomelo/index';
import { RESERVED } from './util/constants';
  declare module 'path_to/application' {
    export interface Application {
      get(setting: 'mykey'):SomeType;
    }
  }
  */
  get(setting: string): any {
    return this._settings[setting];
  }

  enabled(setting: string) {
    return !!this.get(setting);
  }

  disabled(setting: string) {
    return !this.get(setting);
  }

  enable(setting: string) {
    return this.set(setting, true);
  }

  disable(setting: string) {
    return this.set(setting, false);
  }

  configure(env: string, type: string, fn: Function) {
    let args = [].slice.call(arguments);
    fn = args.pop();
    env = type = RESERVED.ALL;

    if (args.length > 0) {
      env = args[0];
    }
    if (args.length > 1) {
      type = args[1];
    }

    if (env === RESERVED.ALL || contains(this.settings.env, env)) {
      if (type === RESERVED.ALL || contains(this.settings.serverType, type)) {
        fn.call(this);
      }
    }
    return this;
  }

  registerAdmin(
    moduleId: string,
    module?: Module | Function | any,
    opts?: any
  ) {
    let modules: ModuleInfoMap = this.get(KEYWORDS.MODULE);
    if (!modules) {
      modules = {};
      this.set(KEYWORDS.MODULE, modules);
    }

    if (typeof moduleId !== "string") {
      opts = module;
      module = moduleId;
      if (module) {
        moduleId = (<Module>module).moduleId;
      }
    }

    if (!moduleId) {
      return;
    }

    modules[moduleId as string] = {
      moduleId: moduleId,
      module: module,
      opts: opts
    };
  }

  use(plugin: any, opts?: any) {
    if (!plugin.components) {
      logger.error("invalid components, no components exist");
      return;
    }

    opts = opts || {};
    let dir = path.dirname(plugin.components);

    if (!fs.existsSync(plugin.components)) {
      logger.error("fail to find components, find path: %s", plugin.components);
      return;
    }

    fs.readdirSync(plugin.components).forEach(filename => {
      if (!/\.js$/.test(filename)) {
        return;
      }
      let name = path.basename(filename, ".js");
      let param = opts[name] || {};
      let absolutePath = path.join(dir, DIR.COMPONENT, filename);
      if (!fs.existsSync(absolutePath)) {
        logger.error("component %s not exist at %s", name, absolutePath);
      } else {
        this.load(require(absolutePath), param);
      }
    });

    // load events
    if (!plugin.events) {
      return;
    } else {
      if (!fs.existsSync(plugin.events)) {
        logger.error("fail to find events, find path: %s", plugin.events);
        return;
      }

      fs.readdirSync(plugin.events).forEach(filename => {
        if (!/\.js$/.test(filename)) {
          return;
        }
        let absolutePath = path.join(dir, DIR.EVENT, filename);
        if (!fs.existsSync(absolutePath)) {
          logger.error("events %s not exist at %s", filename, absolutePath);
        } else {
          bindEvents(require(absolutePath), this);
        }
      });
    }
  }

  transaction(
    name: string,
    conditions: CallbackMap,
    handlers: CallbackMap,
    retry: number
  ) {
    appManager.transaction(name, conditions, handlers, retry);
  }

  getServerById(serverId: string) {
    return this._servers[serverId];
  }

  getServerFromConfig(serverId: string) {
    return this.serversFromConfig[serverId];
  }

  getServersByType(serverType: string) {
    return this._serverTypeMaps[serverType];
  }

  isFrontend(server?: ServerInfo) {
    server = server || this.curServer;
    return !!server && server.frontend === "true";
  }

  isBackend(server?: ServerInfo) {
    server = server || this.curServer;
    return !!server && !server.frontend;
  }

  isMaster() {
    return this.serverType === RESERVED.MASTER;
  }

  addServers(servers: ServerInfo[]) {
    if (!servers || !servers.length) {
      return;
    }

    for (let i = 0, l = servers.length; i < l; i++) {
      let item = servers[i];
      // update global server map
      this._servers[item.id] = item;

      // update global server type map
      let slist = this._serverTypeMaps[item.serverType];
      if (!slist) {
        this._serverTypeMaps[item.serverType] = slist = [];
      }
      replaceServer(slist, item);

      // update global server type list
      if (this.serverTypes.indexOf(item.serverType) < 0) {
        this.serverTypes.push(item.serverType);
      }
    }
    this.event.emit(events.ADD_SERVERS, servers);
  }

  removeServers(ids: string[]) {
    if (!ids || !ids.length) {
      return;
    }

    for (let i = 0, l = ids.length; i < l; i++) {
      let id = ids[i];
      let item = this.servers[id];
      if (!item) {
        continue;
      }
      // clean global server map
      delete this._servers[id];

      // clean global server type map
      let slist = this._serverTypeMaps[item.serverType];
      removeServer(slist, id);
      // TODO: should remove the server type if the slist is empty?
    }
    this.event.emit(events.REMOVE_SERVERS, ids);
  }

  replaceServers(servers: ServerInfoMap) {
    if (!servers) {
      return;
    }

    this._servers = servers;
    this._serverTypeMaps = {};
    this._serverTypes = [];
    let serverArray = [];
    for (let id in servers) {
      let server = servers[id];
      let serverType = server[RESERVED.SERVER_TYPE];
      let slist = this._serverTypeMaps[serverType];
      if (!slist) {
        this._serverTypeMaps[serverType] = slist = [];
      }
      this._serverTypeMaps[serverType].push(server);
      // update global server type list
      if (this._serverTypes.indexOf(serverType) < 0) {
        this._serverTypes.push(serverType);
      }
      serverArray.push(server);
    }
    this.event.emit(events.REPLACE_SERVERS, serverArray);
  }

  addCrons(crons: Cron[]) {
    if (!crons || !crons.length) {
      logger.warn("crons is not defined.");
      return;
    }
    this.event.emit(events.ADD_CRONS, crons);
  }

  removeCrons(crons: Cron[]) {
    if (!crons || !crons.length) {
      logger.warn("ids is not defined.");
      return;
    }
    this.event.emit(events.REMOVE_CRONS, crons);
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
      let env = this.get(RESERVED.ENV);
      let originPath = path.join(this.base, FILEPATH.LOG);
      let presentPath = path.join(
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
    let filePath = path.join(
      this.base,
      FILEPATH.SERVER_DIR,
      this.serverType,
      FILEPATH.LIFECYCLE
    );
    if (!fs.existsSync(filePath)) {
      return;
    }
    let lifecycle = require(filePath);
    for (let key in lifecycle) {
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

  startByType(cb?: Function) {
    if (!!this.startId) {
      if (this.startId === RESERVED.MASTER) {
        invokeCallback(cb!);
      } else {
        runServers(this);
      }
    } else {
      if (
        !!this.type &&
        this.type !== RESERVED.ALL &&
        this.type !== RESERVED.MASTER
      ) {
        runServers(this);
      } else {
        invokeCallback(cb!);
      }
    }
  }

  loadDefaultComponents() {
    let pomelo = require("./pomelo").default;
    // load system default components
    if (this.serverType === RESERVED.MASTER) {
      this.load(<any>pomelo.master, this.get("masterConfig"));
    } else {
      this.load(<any>pomelo.proxy, this.get("proxyConfig"));
      if (this.curServer.port) {
        this.load(<any>pomelo.remote, this.get("remoteConfig"));
      }
      if (this.isFrontend()) {
        this.load(<any>pomelo.connection, this.get("connectionConfig"));
        this.load(<any>pomelo.connector, this.get("connectorConfig"));
        this.load(<any>pomelo.session, this.get("sessionConfig"));
        // compatible for schedulerConfig
        if (this.get("schedulerConfig")) {
          this.load(<any>pomelo.pushScheduler, this.get("schedulerConfig"));
        } else {
          this.load(<any>pomelo.pushScheduler, this.get("pushSchedulerConfig"));
        }
      }
      this.load(<any>pomelo.backendSession, this.get("backendSessionConfig"));
      this.load(<any>pomelo.channel, this.get("channelConfig"));
      this.load(<any>pomelo.server, this.get("serverConfig"));
    }
    this.load(<any>pomelo.monitor, this.get("monitorConfig"));
  }

  stopComps(comps: any[], index: number, force: boolean, cb?: Function) {
    if (index >= comps.length) {
      invokeCallback(cb!);
      return;
    }
    let comp = comps[index];
    if (typeof comp.stop === "function") {
      comp.stop(force, () => {
        // ignore any error
        this.stopComps(comps, index + 1, force, cb);
      });
    } else {
      this.stopComps(comps, index + 1, force, cb);
    }
  }

  optComponents(comps: any[], method: string, cb?: Function) {
    /*
    async function callCompMethod(comp: any) {
      return new Promise((c, e) => {
        comp[method](c);
      });
    }
    for (let comp of comps) {
      if (typeof comp[method] === "function") {
        let err: any = await callCompMethod(comp);
        if (err) {
          if (typeof err === "string") {
            logger.error(
              "fail to operate component, method: %s, err: %j",
              method,
              err
            );
          } else {
            logger.error(
              "fail to operate component, method: %s, err: %j",
              method,
              err.stack
            );
          }
          invokeCallback(cb!, err);
          return;
        }
      }
    }
    invokeCallback(cb!);
    */
    let i = 0;
    async.forEachSeries(
      comps,
      (comp: any, done: any) => {
        i++;
        if (typeof comp[method] === "function") {
          comp[method](done);
        } else {
          done();
        }
      },
      (err: any) => {
        if (err) {
          if (typeof err === "string") {
            logger.error(
              "fail to operate component, method: %s, err: %j",
              method,
              err
            );
          } else {
            logger.error(
              "fail to operate component, method: %s, err: %j",
              method,
              err.stack
            );
          }
        }
        invokeCallback(cb!, err);
      }
    );
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

function replaceServer(slist: ServerInfo[], serverInfo: ServerInfo) {
  for (let i = 0, l = slist.length; i < l; i++) {
    if (slist[i].id === serverInfo.id) {
      slist[i] = serverInfo;
      return;
    }
  }
  slist.push(serverInfo);
}

function removeServer(slist: ServerInfo[], id: string) {
  if (!slist || !slist.length) {
    return;
  }

  for (let i = 0, l = slist.length; i < l; i++) {
    if (slist[i].id === id) {
      slist.splice(i, 1);
      return;
    }
  }
}

function contains(str: string, settings: string) {
  if (!settings) {
    return false;
  }

  let ts = settings.split("|");
  for (let i = 0, l = ts.length; i < l; i++) {
    if (str === ts[i]) {
      return true;
    }
  }
  return false;
}

interface EventConstructor<T> {
  new (app: Application): T;
}

function bindEvents<T>(Event: EventConstructor<T>, app: Application) {
  let emethods = new Event(app);
  for (let m in emethods) {
    if (typeof emethods[m] === "function") {
      app.event.on(m, (<any>emethods[m]).bind(emethods));
    }
  }
}

function addFilter(app: Application, type: string, filter: Filter | RPCFilter) {
  let filters = app.get(type);
  if (!filters) {
    filters = [];
    app.set(type, filters);
  }
  filters.push(filter);
}

export { Application };
