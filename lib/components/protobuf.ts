import { Application } from "../application";
import fs = require("fs");
import path = require("path");
const protobuf = require("pomelo-protobuf");
import crypto = require("crypto");
import { Component } from "../index";
import { RESERVED, FILEPATH } from "../util/constants";
import { FSWatcher } from "fs";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export default function(app: Application, opts?: any) {
  return new ProtobufComponent(app, opts);
}

export class ProtobufComponent implements Component {
  readonly name = "__protobuf__";
  private serverProtosPath: string;
  private clientProtosPath: string;
  private serverProtos: { [idx: string]: any };
  private clientProtos: { [idx: string]: any };
  private version: string;
  private watchers: { [idx: string]: FSWatcher };
  constructor(readonly app: Application, opts?: any) {
    opts = opts || {};
    this.watchers = {};
    this.serverProtos = {};
    this.clientProtos = {};
    this.version = "";

    let env = app.get(RESERVED.ENV);
    let originServerPath = path.join(app.base, FILEPATH.SERVER_PROTOS);
    let presentServerPath = path.join(
      FILEPATH.CONFIG_DIR,
      env,
      path.basename(FILEPATH.SERVER_PROTOS)
    );
    let originClientPath = path.join(app.base, FILEPATH.CLIENT_PROTOS);
    let presentClientPath = path.join(
      FILEPATH.CONFIG_DIR,
      env,
      path.basename(FILEPATH.CLIENT_PROTOS)
    );

    this.serverProtosPath =
      opts.serverProtos ||
      (fs.existsSync(originServerPath)
        ? FILEPATH.SERVER_PROTOS
        : presentServerPath);
    this.clientProtosPath =
      opts.clientProtos ||
      (fs.existsSync(originClientPath)
        ? FILEPATH.CLIENT_PROTOS
        : presentClientPath);

    this.setProtos(RESERVED.SERVER, path.join(app.base, this.serverProtosPath));
    this.setProtos(RESERVED.CLIENT, path.join(app.base, this.clientProtosPath));

    protobuf.init({
      encoderProtos: this.serverProtos,
      decoderProtos: this.clientProtos
    });
  }
  encode(key: string, msg: any) {
    return protobuf.encode(key, msg);
  }

  encode2Bytes(key: string, msg: any) {
    return protobuf.encode2Bytes(key, msg);
  }

  decode(key: string, msg: any) {
    return protobuf.decode(key, msg);
  }

  getProtos() {
    return {
      server: this.serverProtos,
      client: this.clientProtos,
      version: this.version
    };
  }

  getVersion() {
    return this.version;
  }

  setProtos(type: string, path: string) {
    if (!fs.existsSync(path)) {
      return;
    }

    if (type === RESERVED.SERVER) {
      this.serverProtos = protobuf.parse(require(path));
    }

    if (type === RESERVED.CLIENT) {
      this.clientProtos = protobuf.parse(require(path));
    }

    let oStr =
      JSON.stringify(this.clientProtos) + JSON.stringify(this.serverProtos);
    this.version = crypto
      .createHash("md5")
      .update(oStr)
      .digest("base64");

    //Watch file
    let watcher = fs.watch(path, this.onUpdate.bind(this, type, path));
    if (this.watchers[type]) {
      this.watchers[type].close();
    }
    this.watchers[type] = watcher;
  }

  onUpdate(type: string, path: string, event: string) {
    if (event !== "change") {
      return;
    }

    let self = this;
    fs.readFile(path, "utf8", function(err, data) {
      try {
        let os = protobuf.parse(JSON.parse(data));
        if (type === RESERVED.SERVER) {
          protobuf.setEncoderProtos(os);
          self.serverProtos = os;
        } else {
          protobuf.setDecoderProtos(os);
          self.clientProtos = os;
        }

        let oStr =
          JSON.stringify(self.clientProtos) + JSON.stringify(self.serverProtos);
        self.version = crypto
          .createHash("md5")
          .update(oStr)
          .digest("base64");
        logger.info(
          "change o file , type : %j, path : %j, version : %j",
          type,
          path,
          self.version
        );
      } catch (e) {
        logger.warn("change o file error! path : %j", path);
        logger.warn(e);
      }
    });
  }

  stop(force: boolean, cb: Function) {
    for (let type in this.watchers) {
      this.watchers[type].close();
    }
    this.watchers = {};
    process.nextTick(cb);
  }
}
