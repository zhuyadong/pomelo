import { EventEmitter } from 'events';
import fs = require('fs');
import path = require('path');
import { Application } from './application';
import events from './util/events';
export {events};
const Package = require('../package');

export const app:Application = Application.instance;
export const version:string = Package.version;

export interface ISocket extends EventEmitter{
    send(msg:any):void;
    disconnect():void;
    sendBatch(msgs:ArrayLike<any>):void;
}