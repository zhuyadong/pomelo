import { Filter } from "../../application";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
import utils = require("../../util/utils");
import { FrontendSession } from "../../index";

const DEFAULT_TIMEOUT = 3000;
const DEFAULT_SIZE = 500;

export = (timeout?: number, maxSize?: number)=> {
  return new TimeoutFilter(timeout || DEFAULT_TIMEOUT, maxSize || DEFAULT_SIZE);
}

class TimeoutFilter implements Filter {
  private curId: number;
  private timeouts: any;
  constructor(readonly timeout: number, readonly maxSize: number) {
    this.curId = 0;
    this.timeouts = {};
  }
  before(msg: any, session: FrontendSession, next: Function) {
    var count = utils.size(this.timeouts);
    if (count > this.maxSize) {
      logger.warn(
        "timeout filter is out of range, current size is %s, max size is %s",
        count,
        this.maxSize
      );
      next();
      return;
    }
    this.curId++;
    this.timeouts[this.curId] = setTimeout(() => {
      logger.error("request %j timeout.", msg.__route__);
    }, this.timeout);
    session.__timeout__ = this.curId;
    next();
  }

  after(err: any, msg: any, session: FrontendSession, resp: any, next: Function) {
    var timeout = this.timeouts[session.__timeout__!];
    if (timeout) {
      clearTimeout(timeout);
      delete this.timeouts[session.__timeout__!];
    }
    next(err);
  }
}
