import * as starter from "./starter";
import util = require("util");
import {
  ServerInfo,
  Module,
  Application,
  RESERVED,
  moduleUtil,
  utils,
  TIME
} from "../index";

const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const crashLogger = require("pomelo-logger").getLogger("crash-log", __filename);
const adminLogger = require("pomelo-logger").getLogger("admin-log", __filename);
const admin = require("pomelo-admin");

export default class Master {
  readonly masterInfo: ServerInfo;
  private modules: Module[];
  private closeWatcher: boolean;
  private masterConsole: any; //TODO
  private registered: any; //TODO
  constructor(readonly app: Application, opts?: any) {
    this.masterInfo = app.master;
    this.registered = {};
    this.modules = [];
    opts = opts || {};

    opts.port = this.masterInfo.port;
    opts.env = this.app.get(RESERVED.ENV);
    this.closeWatcher = opts.closeWatcher;
    this.masterConsole = admin.createMasterConsole(opts);
  }
  start(cb?: Function) {
    moduleUtil.registerDefaultModules(true, this.app, this.closeWatcher);
    moduleUtil.loadModules(this, this.masterConsole);

    // start master console
    this.masterConsole.start((err: any) => {
      if (err) {
        process.exit(0);
      }
      moduleUtil.startModules(this.modules, (err: any) => {
        if (err) {
          utils.invokeCallback(cb!, err);
          return;
        }

        if (this.app.get(RESERVED.MODE) !== RESERVED.STAND_ALONE) {
          starter.runServers(this.app);
        }
        utils.invokeCallback(cb!);
      });
    });

    this.masterConsole.on("error", (err: any) => {
      if (!!err) {
        logger.error("masterConsole encounters with error: " + err.stack);
        return;
      }
    });

    this.masterConsole.on("reconnect", (info: ServerInfo) => {
      this.app.addServers([info]);
    });

    // monitor servers disconnect event
    this.masterConsole.on(
      "disconnect",
      (id: string, type: string, info: ServerInfo, reason: any) => {
        crashLogger.info(
          util.format(
            "[%s],[%s],[%s],[%s]",
            type,
            id,
            Date.now(),
            reason || "disconnect"
          )
        );
        let count = 0;
        let time = 0;
        let pingTimer: any = null;
        let server = this.app.getServerById(id);
        let stopFlags = this.app.get(RESERVED.STOP_SERVERS) || [];
        if (
          !!server &&
          (server[RESERVED.AUTO_RESTART] === "true" ||
            server[RESERVED.RESTART_FORCE] === "true") &&
          stopFlags.indexOf(id) < 0
        ) {
          let setTimer = (time: number) => {
            pingTimer = setTimeout(() => {
              utils.ping(server.host, flag => {
                if (flag) {
                  handle();
                } else {
                  count++;
                  if (count > 3) {
                    time = TIME.TIME_WAIT_MAX_PING;
                  } else {
                    time = TIME.TIME_WAIT_PING * count;
                  }
                  setTimer(time);
                }
              });
            }, time);
          };
          setTimer(time);
          let handle = () => {
            clearTimeout(pingTimer);
            utils.checkPort(server, (status: string) => {
              if (status === "error") {
                utils.invokeCallback(
                  cb!,
                  new Error("Check port command executed with error.")
                );
                return;
              } else if (status === "busy") {
                if (!!server[RESERVED.RESTART_FORCE]) {
                  starter.kill([info.pid], [server]);
                } else {
                  utils.invokeCallback(
                    cb!,
                    new Error(
                      "Port occupied already, check your server to add."
                    )
                  );
                  return;
                }
              }
              setTimeout(() => {
                starter.run(this.app, server);
              }, TIME.TIME_WAIT_STOP);
            });
          };
        }
      }
    );

    // monitor servers register event
    this.masterConsole.on("register", (record: any) => {
      starter.bindCpu(record.id, record.pid, record.host);
    });

    this.masterConsole.on("admin-log", (log: any, error: any) => {
      if (error) {
        adminLogger.error(JSON.stringify(log));
      } else {
        adminLogger.info(JSON.stringify(log));
      }
    });
  }

  stop(cb: Function) {
    this.masterConsole.stop();
    process.nextTick(cb);
  }
}

export { Master };
