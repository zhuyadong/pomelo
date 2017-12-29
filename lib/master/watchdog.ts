import { EventEmitter } from "events";
import {
  utils,
  Application,
  ServerInfoMap,
  ServerInfo,
  KEYWORDS,
  SIGNAL,
  TIME
} from "../index";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
import * as countDownLatch from "../util/countDownLatch";

export = class Watchdog extends EventEmitter {
  private isStarted: boolean;
  private count: number;
  private servers: ServerInfoMap;
  private listenerMap: { [idx: string]: number };
  constructor(readonly app: Application, readonly service: any) {
    //TODO
    super();
    this.app = app;
    this.service = service;
    this.isStarted = false;
    this.count = utils.size(app.getServersFromConfig());

    this.servers = {};
    this.listenerMap = {};
  }

  addServer(server: ServerInfo) {
    if (!server) {
      return;
    }
    this.servers[server.id] = server;
    this.notify({ action: "addServer", server: server });
  }

  removeServer(id: string) {
    if (!id) {
      return;
    }
    this.unsubscribe(id);
    delete this.servers[id];
    this.notify({ action: "removeServer", id: id });
  }

  reconnectServer(server: ServerInfo) {
    let self = this;
    if (!server) {
      return;
    }
    if (!this.servers[server.id]) {
      this.servers[server.id] = server;
    }
    //replace server in reconnect server
    this.notifyById(server.id, {
      action: "replaceServer",
      servers: self.servers
    });
    // notify other server to add server
    this.notify({ action: "addServer", server: server });
    // add server in listener
    this.subscribe(server.id);
  }

  subscribe(id: string) {
    this.listenerMap[id] = 1;
  }

  unsubscribe(id: string) {
    delete this.listenerMap[id];
  }

  query() {
    return this.servers;
  }

  record(id: string) {
    if (!this.isStarted && --this.count < 0) {
      let usedTime = Date.now() - this.app.startTime;
      logger.info("all servers startup in %s ms", usedTime);
      this.notify({ action: "startOver" });
      this.isStarted = true;
    }
  }

  notifyById(id: string, msg: any) {
    this.service.agent.request(
      id,
      KEYWORDS.MONITOR_WATCHER,
      msg,
      (signal: number) => {
        if (signal !== SIGNAL.OK) {
          logger.error(
            "master watchdog fail to notify to monitor, id: %s, msg: %j",
            id,
            msg
          );
        } else {
          logger.debug(
            "master watchdog notify to monitor success, id: %s, msg: %j",
            id,
            msg
          );
        }
      }
    );
  }

  notify(msg: any) {
    let listenerMap = this.listenerMap;
    let success = true;
    let fails: string[] = [];
    let timeouts: string[] = [];
    let requests: { [idx: string]: number } = {};
    let count = utils.size(listenerMap);
    if (count === 0) {
      logger.warn("master watchdog listenerMap is none, msg: %j", msg);
      return;
    }
    let latch = countDownLatch.createCountDownLatch(
      count,
      { timeout: TIME.TIME_WAIT_COUNTDOWN },
      (isTimeout: boolean) => {
        if (!!isTimeout) {
          for (let key in requests) {
            if (!requests[key]) {
              timeouts.push(key);
            }
          }
          logger.error(
            "master watchdog request timeout message: %j, timeouts: %j, fails: %j",
            msg,
            timeouts,
            fails
          );
        }
        if (!success) {
          logger.error(
            "master watchdog request fail message: %j, fails: %j",
            msg,
            fails
          );
        }
      }
    );

    let moduleRequest = (self: Watchdog, id: string) => {
      return (() => {
        self.service.agent.request(
          id,
          KEYWORDS.MONITOR_WATCHER,
          msg,
          (signal: number) => {
            if (signal !== SIGNAL.OK) {
              fails.push(id);
              success = false;
            }
            requests[id] = 1;
            latch.done();
          }
        );
      })();
    };

    for (let id in listenerMap) {
      requests[id] = 0;
      moduleRequest(this, id);
    }
  }
};
