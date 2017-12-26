import utils = require("../util/utils");
import { Application, Scheduler } from "../application";
import { Session } from "../common/service/sessionService";

export default (app: Application, opts?: any) => {
  return new DirectPushScheduler(app, opts);
};
export class DirectPushScheduler implements Scheduler {
  constructor(readonly app: Application, opts?: any) {}

  schedule(
    reqId: number,
    route: string,
    msg: any,
    recvs: number[],
    opts: any,
    cb?: Function
  ) {
    opts = opts || {};
    if (opts.type === "broadcast") {
      this.doBroadcast(msg, opts.userOptions);
    } else {
      this.doBatchPush(msg, recvs);
    }

    if (cb) {
      process.nextTick(function() {
        utils.invokeCallback(cb);
      });
    }
  }

  protected doBroadcast(msg: any, opts: any) {
    let channelService = this.app.get("channelService");
    let sessionService = this.app.get("sessionService");

    if (opts.binded) {
      sessionService.forEachBindedSession((session: Session) => {
        if (
          channelService.broadcastFilter &&
          !channelService.broadcastFilter(session, msg, opts.filterParam)
        ) {
          return;
        }

        sessionService.sendMessageByUid(session.uid, msg);
      });
    } else {
      sessionService.forEachSession((session: Session) => {
        if (
          channelService.broadcastFilter &&
          !channelService.broadcastFilter(session, msg, opts.filterParam)
        ) {
          return;
        }

        sessionService.sendMessage(session.id, msg);
      });
    }
  }

  doBatchPush(msg: any, recvs: number[]) {
    let sessionService = this.app.get("sessionService");
    for (let i = 0, l = recvs.length; i < l; i++) {
      sessionService.sendMessage(recvs[i], msg);
    }
  }
}
