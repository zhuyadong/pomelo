let logger = require("pomelo-logger").getLogger("pomelo", __filename);
import fs = require("fs");
import path = require("path");
import pathUtil = require("../util/pathUtil");
let Loader = require("pomelo-loader");
import utils = require("../util/utils");
let schedule = require("pomelo-scheduler");

import { FilterService } from "../common/service/filterService";
import {
  HandlerService,
  HandlersMap,
  Handlers
} from "../common/service/handlerService";
import { Application, Component, Cron } from "../application";
import { events, FrontendSession, BackendSession } from "../index";
import { RESERVED, FILEPATH, KEYWORDS } from "../util/constants";
import { Session } from "../common/service/sessionService";
import { format } from "util";

enum State {
  ST_INITED = 0, // server inited
  ST_STARTED = 1, // server started
  ST_STOPED = 2 // server stoped
}

export interface RouteRecord {
  route: string;
  serverType: string;
  handler: string;
  method: string;
}

export type JobMap = { [idx: string]: any };

export class Server {
  readonly crons: Cron[];
  readonly jobs: JobMap;
  readonly cronHandlers: Handlers;
  readonly globalFilterService: FilterService;
  readonly filterService: FilterService;
  readonly handlerService: HandlerService;
  private opts: any;
  private state: State;
  constructor(readonly app: Application, opts?: any) {
    this.opts = opts || {};
    this.globalFilterService = <any>null;
    this.filterService = <any>null;
    this.handlerService = <any>null;
    this.crons = [];
    this.jobs = {};
    this.state = State.ST_INITED;

    app.event.on(events.ADD_CRONS, this.addCrons.bind(this));
    app.event.on(events.REMOVE_CRONS, this.removeCrons.bind(this));
  }
  start() {
    if (this.state > State.ST_INITED) {
      return;
    }

    this.globalFilterService! = initFilter(true, this.app);
    this.filterService! = initFilter(false, this.app);
    this.handlerService! = initHandler(this.app, this.opts);
    this.cronHandlers! = loadCronHandlers(this.app);
    loadCrons(this, this.app);
    this.state = State.ST_STARTED;
  }
  afterStart() {
    scheduleCrons(this, this.crons);
  }
  stop() {
    this.state = State.ST_STOPED;
  }
  globalHandle(msg: any, session: FrontendSession|BackendSession, cb?: Function) {
    if (this.state !== State.ST_STARTED) {
      utils.invokeCallback(cb!, new Error("server not started"));
      return;
    }

    let routeRecord = parseRoute(msg.route);
    if (!routeRecord) {
      utils.invokeCallback(
        cb!,
        new Error(format("meet unknown route message %j", msg.route))
      );
      return;
    }

    let self = this;
    let dispatch = (err: any, resp: any, opts: any) => {
      if (err) {
        handleError(
          true,
          self,
          err,
          msg,
          session,
          resp,
          opts,
          (err: any, resp: any, opts: any) => {
            response(true, self, err, msg, session, resp, opts, cb!);
          }
        );
        return;
      }

      if (self.app.serverType !== routeRecord!.serverType) {
        doForward(
          self.app,
          msg,
          session,
          routeRecord!,
          (err: any, resp: any, opts: any) => {
            response(true, self, err, msg, session, resp, opts, cb!);
          }
        );
      } else {
        doHandle(
          self,
          msg,
          session,
          routeRecord!,
          (err: any, resp: any, opts: any) => {
            response(true, self, err, msg, session, resp, opts, cb!);
          }
        );
      }
    };
    beforeFilter(true, self, msg, session, dispatch);
  }

  handle(msg: any, session: FrontendSession|BackendSession, cb: Function) {
    if (this.state !== State.ST_STARTED) {
      cb(new Error("server not started"));
      return;
    }

    let routeRecord = parseRoute(msg.route);
    doHandle(this, msg, session, routeRecord!, cb);
  }

  addCrons(crons: Cron[]) {
    this.cronHandlers! = loadCronHandlers(this.app);
    for (let i = 0, l = crons.length; i < l; i++) {
      let cron = crons[i];
      checkAndAdd(cron, this.crons, this);
    }
    scheduleCrons(this, crons);
  }

  removeCrons(crons: Cron[]) {
    for (let i = 0, l = crons.length; i < l; i++) {
      let cron = crons[i];
      let id = cron.id;
      if (!!this.jobs[id]) {
        schedule.cancelJob(this.jobs[id]);
      } else {
        logger.warn("cron is not in application: %j", cron);
      }
    }
  }
}

function initFilter(isGlobal: boolean, app: Application) {
  let service = new FilterService();
  let befores, afters;

  if (isGlobal) {
    befores = app.get(KEYWORDS.GLOBAL_BEFORE_FILTER);
    afters = app.get(KEYWORDS.GLOBAL_AFTER_FILTER);
  } else {
    befores = app.get(KEYWORDS.BEFORE_FILTER);
    afters = app.get(KEYWORDS.AFTER_FILTER);
  }

  let i, l;
  if (befores) {
    for (i = 0, l = befores.length; i < l; i++) {
      service.before(befores[i]);
    }
  }

  if (afters) {
    for (i = 0, l = afters.length; i < l; i++) {
      service.after(afters[i]);
    }
  }

  return service;
}

function initHandler(app: Application, opts?: any) {
  return new HandlerService(app, opts);
}

function loadCronHandlers(app: Application) {
  let p = pathUtil.getCronPath(app.base, app.serverType);
  if (p) {
    return Loader.load(p, app);
  }
}

function loadCrons(server: Server, app: Application) {
  let env = app.get(RESERVED.ENV);
  let p = path.join(app.base, FILEPATH.CRON);
  if (!fs.existsSync(p)) {
    p = path.join(
      app.base,
      FILEPATH.CONFIG_DIR,
      env,
      path.basename(FILEPATH.CRON)
    );
    if (!fs.existsSync(p)) {
      return;
    }
  }
  app.loadConfigBaseApp(RESERVED.CRONS, FILEPATH.CRON);
  let crons = app.get(RESERVED.CRONS);
  for (let serverType in crons) {
    if (app.serverType === serverType) {
      let list = crons[serverType];
      for (let i = 0; i < list.length; i++) {
        if (!list[i].serverId) {
          checkAndAdd(list[i], server.crons, server);
        } else {
          if (app.serverId === list[i].serverId) {
            checkAndAdd(list[i], server.crons, server);
          }
        }
      }
    }
  }
}

function beforeFilter(
  isGlobal: boolean,
  server: Server,
  msg: any,
  session: FrontendSession|BackendSession,
  cb?: Function
) {
  let fm;
  if (isGlobal) {
    fm = server.globalFilterService;
  } else {
    fm = server.filterService;
  }
  if (fm) {
    fm.beforeFilter(msg, session, cb!);
  } else {
    utils.invokeCallback(cb!);
  }
}

function afterFilter(
  isGlobal: boolean,
  server: Server,
  err: any,
  msg: any,
  session: FrontendSession|BackendSession,
  resp: any,
  opts: any,
  cb: Function
) {
  let fm;
  if (isGlobal) {
    fm = server.globalFilterService;
  } else {
    fm = server.filterService;
  }
  if (fm) {
    if (isGlobal) {
      fm.afterFilter(err, msg, session, resp, () => {
        // do nothing
      });
    } else {
      fm.afterFilter(err, msg, session, resp, (err: any) => {
        cb(err, resp, opts);
      });
    }
  }
}

function handleError(
  isGlobal: boolean,
  server: Server,
  err: any,
  msg: any,
  session: FrontendSession|BackendSession,
  resp: any,
  opts: any,
  cb: Function
) {
  let handler;
  if (isGlobal) {
    handler = server.app.get(RESERVED.GLOBAL_ERROR_HANDLER);
  } else {
    handler = server.app.get(RESERVED.ERROR_HANDLER);
  }
  if (!handler) {
    logger.debug(
      "no default error handler to resolve unknown exception. " + err.stack
    );
    utils.invokeCallback(cb, err, resp, opts);
  } else {
    if (handler.length === 5) {
      handler(err, msg, resp, session, cb);
    } else {
      handler(err, msg, resp, session, opts, cb);
    }
  }
}

function response(
  isGlobal: boolean,
  server: Server,
  err: any,
  msg: any,
  session: FrontendSession|BackendSession,
  resp: any,
  opts: any,
  cb: Function
) {
  if (isGlobal) {
    cb(err, resp, opts);
    // after filter should not interfere response
    afterFilter(isGlobal, server, err, msg, session, resp, opts, cb);
  } else {
    afterFilter(isGlobal, server, err, msg, session, resp, opts, cb);
  }
}

function parseRoute(route: string) {
  if (!route) {
    return null;
  }
  let ts = route.split(".");
  if (ts.length !== 3) {
    return null;
  }

  return {
    route: route,
    serverType: ts[0],
    handler: ts[1],
    method: ts[2]
  };
}

function doForward(
  app: Application,
  msg: any,
  session: FrontendSession|BackendSession,
  routeRecord: RouteRecord,
  cb?: Function
) {
  let finished = false;
  //should route to other servers
  try {
    app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage(
      // app.sysrpc[routeRecord.serverType].msgRemote.forwardMessage2(
      session,
      msg,
      // msg.oldRoute || msg.route,
      // msg.body,
      // msg.aesPassword,
      // msg.compressGzip,
      session.export(),
      (err: any, resp: any, opts: any) => {
        if (err) {
          logger.error("fail to process remote message:" + err.stack);
        }
        finished = true;
        utils.invokeCallback(cb!, err, resp, opts);
      }
    );
  } catch (err) {
    if (!finished) {
      logger.error(`[${app.serverId}] fail to forward message:` + err.stack);
      utils.invokeCallback(cb!, err);
    }
  }
}

function doHandle(
  server: Server,
  msg: any,
  session: FrontendSession|BackendSession,
  routeRecord: RouteRecord,
  cb?: Function
) {
  let originMsg = msg;
  msg = msg.body || {};
  msg.__route__ = originMsg.route;

  let self = server;

  let handle = (err: any, resp: any, opts: any) => {
    if (err) {
      // error from before filter
      handleError(
        false,
        self,
        err,
        msg,
        session,
        resp,
        opts,
        (err: any, resp: any, opts: any) => {
          response(false, self, err, msg, session, resp, opts, cb!);
        }
      );
      return;
    }

    self.handlerService.handle(
      routeRecord,
      msg,
      session,
      (err: any, resp: any, opts: any) => {
        if (err) {
          //error from handler
          handleError(
            false,
            self,
            err,
            msg,
            session,
            resp,
            opts,
            (err: any, resp: any, opts: any) => {
              response(false, self, err, msg, session, resp, opts, cb!);
            }
          );
          return;
        }

        response(false, self, err, msg, session, resp, opts, cb!);
      }
    );
  }; //end of handle

  beforeFilter(false, server, msg, session, handle);
}

function scheduleCrons(server: Server, crons: Cron[]) {
  let handlers = server.cronHandlers;
  for (let i = 0; i < crons.length; i++) {
    let cronInfo = crons[i];
    let time = cronInfo.time;
    let action = cronInfo.action;
    let jobId = cronInfo.id;

    if (!time || !action || !jobId) {
      logger.error("cron miss necessary parameters: %j", cronInfo);
      continue;
    }

    if (action.indexOf(".") < 0) {
      logger.error("cron action is error format: %j", cronInfo);
      continue;
    }

    let cron = action.split(".")[0];
    let job = action.split(".")[1];
    let handler = handlers[cron];

    if (!handler) {
      logger.error("could not find cron: %j", cronInfo);
      continue;
    }

    if (typeof handler[job] !== "function") {
      logger.error("could not find cron job: %j, %s", cronInfo, job);
      continue;
    }

    let id = schedule.scheduleJob(time, handler[job].bind(handler));
    server.jobs[jobId] = id;
  }
}

function checkAndAdd(cron: Cron, crons: Cron[], server: Server) {
  if (!containCron(cron.id, crons)) {
    server.crons.push(cron);
  } else {
    logger.warn("cron is duplicated: %j", cron);
  }
}

function containCron(id: number, crons: Cron[]) {
  for (let i = 0, l = crons.length; i < l; i++) {
    if (id === crons[i].id) {
      return true;
    }
  }
  return false;
}
