import { EventEmitter } from 'events';
import {Server} from 'net';

export default class Switcher extends EventEmitter{
    constructor(protected server:Server, opts?:object) {
     super();

    }
}