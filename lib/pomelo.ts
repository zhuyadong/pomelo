import { EventEmitter } from 'events';
import fs = require('fs');
import path = require('path');
import { Application } from './application';
import events from './util/events';
import { Socket } from 'net';
import { BackendSessionService } from './common/service/backendSessionService';
import { ChannelService } from './common/service/channelService';
import { ConnectionComponent } from './components/connection';
import { ConnectorComponent } from './components/connector';
export {events};
const Package = require('../package');

export const app:Application = Application.instance;
export const version:string = Package.version;

export interface RemoteAddress {
    ip:string;
    port:string|number;
}

export interface ISocket extends EventEmitter{
    readonly id:number;
    readonly remoteAddress:Readonly<RemoteAddress>;
    send(msg:any):void;
    disconnect():void;
    sendBatch(msgs:ArrayLike<any>):void;
}

export const components = {
  readonly backendSession: (app: Application) => BackendSessionService,
  readonly channel: (app: Application, opts?: object) => ChannelService,
  readonly connection: (app: Application) => ConnectionComponent,
  readonly connector: (app: Application, opts?: object) => ConnectorComponent,
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

export const filters = {

}

export const rpcFilters = {

}

export const connectors = {

}

export const pushSchedulers = {

}

export function createApp(opts?:any) {
    app.init(opts);
    return app;
}