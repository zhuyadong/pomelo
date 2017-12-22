import HybridConnector from "./connectors/hybridconnector";
import { EventEmitter } from "events";
import fs = require("fs");
import path = require("path");
import Application, { Filter } from "./application";
import events from "./util/events";
import { Socket } from "net";
import backendSessionCtor = require("./components/backendSession");
import channelCtor = require("./components/channel");
import connectionCtor = require("./components/connection");
import connectorCtor = require("./components/connector");
import dictionaryCtor = require("./components/dictionary");
import masterCtor = require("./components/master");
import monitorCtor = require("./components/monitor");
import protobufCtor = require("./components/protobuf");
import proxyCtor = require("./components/proxy");
import pushSchedulerCtor = require("./components/pushScheduler");
import serverCtor = require("./components/server");
import sessionCtor = require("./components/session");
import remoteCtor = require("./components/remote");
import timeoutCtor = require("./filters/handler/timeout");
export { events };
import app from "./application";
import SioConnector from "./connectors/sioconnector";
import {
  BackendSessionService,
  ChannelService,
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
  SessionComponent
} from "./index";
const Package = require("../package");

export class Pomelo {
  readonly version: string = Package.version;
  private _components: PomeloComponents;
  private _filters: PomeloFilters;
  private _rpcFilters: PomeloRPCFilters;
  private _connectors: PomeloConnectors;
  private _pushSchedulers: PomeloPushSchedulers;
  constructor() {
    this._components = {} as PomeloComponents;
    this._filters = {} as PomeloFilters;
    this._rpcFilters = {} as PomeloRPCFilters;
    this._connectors = {} as PomeloConnectors;
    this._pushSchedulers = {} as PomeloPushSchedulers;

    fs.readdirSync(__dirname + "/components").forEach(filename => {
      if (!/\.js$/.test(filename)) {
        return;
      }
      let name = path.basename(filename, ".js");
      let _load = load.bind(null, "./components/", name);

      (<any>this._components).__defineGetter__(name, _load);
      //(<any>this).__defineGetter__(name, _load);
    });
    fs.readdirSync(__dirname + "/filters/handler").forEach(filename => {
      if (!/\.js$/.test(filename)) {
        return;
      }
      let name = path.basename(filename, ".js");
      let _load = load.bind(null, "./filters/handler/", name);

      (<any>this._filters).__defineGetter__(name, _load);
      //module.exports.__defineGetter__(name, _load);
    });
    fs.readdirSync(__dirname + "/filters/rpc").forEach(filename => {
      if (!/\.js$/.test(filename)) {
        return;
      }
      let name = path.basename(filename, ".js");
      let _load = load.bind(null, "./filters/rpc/", name);

      (<any>this._rpcFilters).__defineGetter__(name, _load);
    });
    (<any>this._connectors).__defineGetter__(
      "sioconnector",
      load.bind(null, "./connectors/sioconnector")
    );
    (<any>this._connectors).__defineGetter__(
      "hybridconnector",
      load.bind(null, "./connectors/hybridconnector")
    );
    (<any>this._connectors).__defineGetter__(
      "udpconnector",
      load.bind(null, "./connectors/udpconnector")
    );
    (<any>this._connectors).__defineGetter__(
      "mqttconnector",
      load.bind(null, "./connectors/mqttconnector")
    );
    (<any>this._pushSchedulers).__defineGetter__(
      "direct",
      load.bind(null, "./pushSchedulers/direct")
    );
    (<any>this._pushSchedulers).__defineGetter__(
      "buffer",
      load.bind(null, "./pushSchedulers/buffer")
    );
  }

  get app() {
    return Application.instance;
  }

  createApp(opts?: any) {
    this.app.init(opts);
    return this.app;
  }

  get components() {
    return this._components as Readonly<PomeloComponents>;
  }

  get connectors() {
    return this._connectors as Readonly<PomeloConnectors>;
  }
  get filters() {
    return this._filters as Readonly<PomeloFilters>;
  }
  get rpcFilters() {
    return this._rpcFilters as Readonly<PomeloRPCFilters>;
  }

  get backendSession() {
    return backendSessionCtor;
  }
  get channel() {
    return channelCtor;
  }
  get connection() {
    return connectionCtor;
  }
  get connector() {
    return connectorCtor;
  }
  get dictionary() {
    return dictionaryCtor;
  }
  get master() {
    return masterCtor;
  }
  get monitor() {
    return monitorCtor;
  }
  get protobuf() {
    return protobufCtor;
  }
  get proxy() {
    return proxyCtor;
  }
  get pushScheduler() {
    return pushSchedulerCtor;
  }
  get remote() {
    return remoteCtor;
  }
  get server() {
    return serverCtor;
  }
  get session() {
    return sessionCtor;
  }
  get timeout() {
    return timeoutCtor;
  }
}

export interface RemoteAddress {
  ip: string;
  port: string | number;
}

export interface ISocket extends EventEmitter {
  readonly id: number;
  readonly remoteAddress: Readonly<RemoteAddress>;
  send(msg: any): void;
  disconnect(): void;
  sendBatch(msgs: ArrayLike<any>): void;
}

export interface PomeloComponents {
  readonly backendSession: (app: Application) => BackendSessionService;
  readonly channel: (app: Application, opts?: object) => ChannelService;
  readonly connection: (app: Application) => ConnectionComponent;
  readonly connector: (app: Application, opts?: object) => ConnectorComponent;
  readonly dictionary: (app: Application, opts?: object) => DictionaryComponent;
  readonly master: (app: Application, opts?: object) => MasterComponent;
  readonly monitor: (app: Application, opts?: object) => MonitorComponent;
  readonly protobuf: (app: Application, opts?: object) => ProtobufComponent;
  readonly proxy: (app: Application, opts?: object) => ProxyComponent;
  readonly pushScheduler: (
    app: Application,
    opts?: object
  ) => PushSchedulerComponent;
  readonly remote: (app: Application, opts?: object) => RemoteComponent;
  readonly server: (app: Application, opts?: object) => ServerComponent;
  readonly session: (app: Application, opts?: object) => SessionComponent;
}

export interface PomeloFilters {}

export interface PomeloRPCFilters {}

export interface PomeloConnectors {
  hybridconnector: HybridConnector;
  sioconnector: SioConnector;
}

export interface PomeloPushSchedulers {}

function load(path: string, name: string) {
  let mod: any;
  if (name) {
    mod = require(path + name);
  } else {
    mod = require(path);
  }
  if (mod && mod.default) mod = mod.default;
  return mod;
}

let pomelo = new Pomelo();
export default pomelo;
