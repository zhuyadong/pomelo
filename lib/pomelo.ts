import { EventEmitter } from "events";
import fs = require("fs");
import path = require("path");
import { Application } from "./application";
import events from "./util/events";
import { Socket } from "net";
import { BackendSessionService } from "./common/service/backendSessionService";
import { ChannelService } from "./common/service/channelService";
import { ConnectionComponent } from "./components/connection";
import { ConnectorComponent } from "./components/connector";
import { DictionaryComponent } from "./components/dictionary";
import { MasterComponent } from "./components/master";
import { MonitorComponent } from "./components/monitor";
import { ProtobufComponent } from "./components/protobuf";
import { ProxyComponent } from "./components/proxy";
import { PushSchedulerComponent } from "./components/pushScheduler";
import { ServerComponent } from "./components/server";
import { SessionComponent } from "./components/session";
import { RemoteComponent } from "./components/remote";
export { events };
const Package = require("../package");

export const app: Application = Application.instance;
export const version: string = Package.version;

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

export const components = {} as Readonly<PomeloComponents>;

export interface PomeloFilters {}

export const filters = {} as Readonly<PomeloFilters>;

export interface PomeloRPCFilters {}

export const rpcFilters = {} as Readonly<PomeloRPCFilters>;

export interface PomeloConnectors {}

export const connectors = {} as Readonly<PomeloConnectors>;
(<any>connectors).__defineGetter__(
  "sioconnector",
  load.bind(null, "./connectors/sioconnector")
);
(<any>connectors).__defineGetter__(
  "hybridconnector",
  load.bind(null, "./connectors/hybridconnector")
);
(<any>connectors).__defineGetter__(
  "udpconnector",
  load.bind(null, "./connectors/udpconnector")
);
(<any>connectors).__defineGetter__(
  "mqttconnector",
  load.bind(null, "./connectors/mqttconnector")
);

export interface PomeloPushSchedulers {}
export const pushSchedulers = {} as Readonly<PomeloPushSchedulers>;
(<any>pushSchedulers).__defineGetter__(
  "direct",
  load.bind(null, "./pushSchedulers/direct")
);
(<any>pushSchedulers).__defineGetter__(
  "buffer",
  load.bind(null, "./pushSchedulers/buffer")
);

export function createApp(opts?: any) {
  app.init(opts);
  return app;
}

fs.readdirSync(__dirname + "/components").forEach(filename => {
  if (!/\.js$/.test(filename)) {
    return;
  }
  let name = path.basename(filename, ".js");
  let _load = load.bind(null, "./components/", name);

  (<any>components).__defineGetter__(name, _load);
  module.exports.__defineGetter__(name, _load);
});

declare const backendSession: BackendSessionService;
declare const channel: ChannelService;
declare const connection: ConnectionComponent;
declare const connector: ConnectorComponent;
declare const dictionary: DictionaryComponent;
declare const master: MasterComponent;
declare const monitor: MonitorComponent;
declare const protobuf: ProtobufComponent;
declare const proxy: ProxyComponent;
declare const pushScheduler: PushSchedulerComponent;
declare const remote: RemoteComponent;
declare const server: ServerComponent;
declare const session: SessionComponent;

fs.readdirSync(__dirname + "/filters/handler").forEach(filename => {
  if (!/\.js$/.test(filename)) {
    return;
  }
  let name = path.basename(filename, ".js");
  let _load = load.bind(null, "./filters/handler/", name);

  (<any>filters).__defineGetter__(name, _load);
  module.exports.__defineGetter__(name, _load);
});

fs.readdirSync(__dirname + "/filters/rpc").forEach(filename => {
  if (!/\.js$/.test(filename)) {
    return;
  }
  let name = path.basename(filename, ".js");
  let _load = load.bind(null, "./filters/rpc/", name);

  (<any>rpcFilters).__defineGetter__(name, _load);
});

function load(path: string, name: string) {
  if (name) {
    return require(path + name);
  }
  return require(path);
}
