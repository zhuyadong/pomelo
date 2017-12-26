import {
  Scheduler,
  SchedulerMap,
  Application,
  DirectPushSchedulerConstructor,
  SchedulerConstructor
} from "../../index";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export class PushSchedulerComponent {
  readonly name = "__pushScheduler__";
  private isSelectable: boolean;
  private scheduler: Scheduler | SchedulerMap;
  private selector: (
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb: Function
  ) => void;
  constructor(readonly app: Application, opts?: any) {
    opts = opts || {};
    this.scheduler = this.getScheduler(app, opts);
  }
  afterStart(cb: Function) {
    if (this.isSelectable) {
      for (let k in this.scheduler) {
        let sch = (<SchedulerMap>this.scheduler)[k];
        if (typeof sch.start === "function") {
          sch.start();
        }
      }
      process.nextTick(cb);
    } else if (typeof (<Scheduler>this.scheduler).start === "function") {
      (<Scheduler>this.scheduler).start!(cb);
    } else {
      process.nextTick(cb);
    }
  }

  stop(force: boolean, cb: Function) {
    if (this.isSelectable) {
      for (let k in this.scheduler) {
        let sch = (<SchedulerMap>this.scheduler)[k];
        if (typeof sch.stop === "function") {
          sch.stop();
        }
      }
      process.nextTick(cb);
    } else if (typeof (<Scheduler>this.scheduler).stop === "function") {
      (<Scheduler>this.scheduler).stop!(cb);
    } else {
      process.nextTick(cb);
    }
  }

  schedule(
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb: Function
  ) {
    if (this.isSelectable) {
      if (typeof this.selector === "function") {
        this.selector(reqId, route, msg, recvs, opts, (id: string) => {
          if (
            (<SchedulerMap>this.scheduler)[id] &&
            typeof (<SchedulerMap>this.scheduler)[id].schedule === "function"
          ) {
            (<SchedulerMap>this.scheduler)[id].schedule(
              reqId,
              route,
              msg,
              recvs,
              opts,
              cb
            );
          } else {
            logger.error("invalid pushScheduler id, id: %j", id);
          }
        });
      } else {
        logger.error(
          "the selector for pushScheduler is not a function, selector: %j",
          this.selector
        );
      }
    } else {
      if (typeof (<Scheduler>this.scheduler).schedule === "function") {
        (<Scheduler>this.scheduler).schedule(
          reqId,
          route,
          msg,
          recvs,
          opts,
          cb
        );
      } else {
        logger.error(
          "the scheduler does not have a schedule function, scheduler: %j",
          this.scheduler
        );
      }
    }
  }
  private getScheduler(app: Application, opts: any): Scheduler | SchedulerMap {
    let scheduler = opts.scheduler || DirectPushSchedulerConstructor;
    if (typeof scheduler === "function") {
      return scheduler(app, opts);
    }

    if (Array.isArray(scheduler)) {
      let res: SchedulerMap = {};
      scheduler.forEach(
        (sch: {
          id: string;
          scheduler: Scheduler | SchedulerConstructor;
          options?: any;
        }) => {
          if (typeof sch.scheduler === "function") {
            res[sch.id] = sch.scheduler(app, sch.options);
          } else {
            res[sch.id] = sch.scheduler;
          }
        }
      );
      this.isSelectable = true;
      this.selector = opts.selector;
      return res;
    }

    return scheduler;
  }
}
