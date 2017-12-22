import net = require("net");
import tls = require("tls");
import util = require("util");
import HybridSocket from "./hybridsocket";
import Switcher from "./hybrid/switcher";
import { EventEmitter } from "events";
import {
  Connector,
  DictionaryComponent,
  ProtobufComponent,
  Application
} from "../index";

const Handshake = require("./commands/handshake");
const Heartbeat = require("./commands/heartbeat");
const Kick = require("./commands/kick");
const coder = require("./common/coder");

let curId = 1;

export default class HybridConnector extends EventEmitter implements Connector {
  static encode = coder.encode;
  static decode = coder.decode;
  encode = coder.encode;
  decode = coder.decode;
  private useDict: boolean;
  private useProtobuf: boolean;
  private handshake: any; //TODO
  private heartbeat: any; //TODO
  private distinctHost: boolean;
  private ssl: any; //TODO
  private switcher: any; //TODO
  private connector: Connector;
  private dictionary: DictionaryComponent;
  private protobuf: ProtobufComponent;
  private decodeIO_protobuf: any; //TODO
  private listeningServer: net.Server;
  constructor(private port: number, private host: string, private opts?: any) {
    super();
    if (!(this instanceof HybridConnector)) {
      return new HybridConnector(port, host, opts);
    }
    this.opts = opts || {};
    this.port = port;
    this.host = host;
    this.useDict = opts.useDict;
    this.useProtobuf = opts.useProtobuf;
    this.handshake = new Handshake(opts);
    this.heartbeat = new Heartbeat(opts);
    this.distinctHost = opts.distinctHost;
    this.ssl = opts.ssl;

    this.switcher = null;
  }

  start(cb: Function) {
    let pomelo = require("../pomelo");
    let app = pomelo.default.app as Application;
    //let app = require("../pomelo").default.app as Application;

    let gensocket = (socket: any) => {
      let hybridsocket = new HybridSocket(curId++, socket);
      hybridsocket.on(
        "handshake",
        this.handshake.handle.bind(this.handshake, hybridsocket)
      );
      hybridsocket.on(
        "heartbeat",
        this.heartbeat.handle.bind(this.heartbeat, hybridsocket)
      );
      hybridsocket.on(
        "disconnect",
        this.heartbeat.clear.bind(this.heartbeat, hybridsocket.id)
      );
      hybridsocket.on("closing", Kick.handle.bind(null, hybridsocket));
      this.emit("connection", hybridsocket);
    };

    this.connector = app.components.__connector__.connector;
    this.dictionary = app.components.__dictionary__;
    this.protobuf = app.components.__protobuf__;
    this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;

    if (!this.ssl) {
      this.listeningServer = net.createServer();
    } else {
      this.listeningServer = tls.createServer(this.ssl);
    }
    this.switcher = new Switcher(this.listeningServer, this.opts);

    this.switcher.on("connection", (socket: any) => {
      gensocket(socket);
    });

    if (!!this.distinctHost) {
      this.listeningServer.listen(this.port, this.host);
    } else {
      this.listeningServer.listen(this.port);
    }

    process.nextTick(cb);
  }

  stop(force: boolean, cb: Function) {
    this.switcher.close();
    this.listeningServer.close();

    process.nextTick(cb);
  }
};
