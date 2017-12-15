import { Session } from "./sessionService";
import { Filter, BeforeFilterFunc, AfterFilterFunc } from "../../application";

const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export type BeforeHanler = Filter | BeforeFilterFunc;
export type AfterHanler = Filter | AfterFilterFunc;

export class FilterService {
  readonly name: string;
  private _befores: BeforeHanler[];
  private _afters: AfterHanler[];
  constructor() {
    this.name = "filter";
    this._befores = [];
    this._afters = [];
  }

  before(filter: BeforeHanler) {
    this._befores.push(filter);
  }

  after(filter: AfterHanler) {
    this._afters.unshift(filter);
  }

  beforeFilter(msg: any, session: Session, cb: Function) {
    let index = 0;
    let next = (err?: any, resp?: any, opts?: any) => {
      if (err || index >= this._befores.length) {
        cb(err, resp, opts);
        return;
      }

      let handler = this._befores[index++];
      if (typeof handler === "function") {
        handler(msg, session, next);
      } else if (typeof handler.before === "function") {
        handler.before(msg, session, next);
      } else {
        logger.error(
          "meet invalid before filter, handler or handler.before should be function."
        );
        next(new Error("invalid before filter."));
      }
    }; //end of next

    next();
  }

  afterFilter(err: any, msg: any, session: Session, resp: any, cb: Function) {
    let index = 0;
    let next = (err: any) => {
      //if done
      if (index >= this._afters.length) {
        cb(err);
        return;
      }

      let handler = this._afters[index++];
      if (typeof handler === "function") {
        handler(err, msg, session, resp, next);
      } else if (typeof handler.after === "function") {
        handler.after(err, msg, session, resp, next);
      } else {
        logger.error(
          "meet invalid after filter, handler or handler.after should be function."
        );
        next(new Error("invalid after filter."));
      }
    }; //end of next

    next(err);
  }
}
