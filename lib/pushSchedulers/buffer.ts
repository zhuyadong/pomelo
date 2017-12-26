import { Application } from "../";
import utils = require("../util/utils");
import { Session } from "../common/service/sessionService";
const DEFAULT_FLUSH_INTERVAL = 20;

export default (app: Application, opts?: any) => {
  return new BufferPushScheduler(app, opts);
};

export class BufferPushScheduler {
  private flushInterval: number;
  private sessions: { [idx: number]: any };
  private tid: any;
  constructor(readonly app: Application, opts?: any) {
    this.flushInterval = opts.flushInterval || DEFAULT_FLUSH_INTERVAL;
    this.sessions = {}; // sid -> msg queue
    this.tid = null;
  }
  start(cb?: Function) {
    this.tid = setInterval(() => this.flush(), this.flushInterval);
    process.nextTick(function() {
      utils.invokeCallback(cb!);
    });
  }

  stop(force: boolean, cb?: Function) {
    if (this.tid) {
      clearInterval(this.tid);
      this.tid = <any>null;
    }
    process.nextTick(function() {
      utils.invokeCallback(cb!);
    });
  }

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

    process.nextTick(() => {
      utils.invokeCallback(cb!);
    });
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

        this.enqueue(session, msg);
      });
    } else {
      sessionService.forEachSession((session: Session) => {
        if (
          channelService.broadcastFilter &&
          !channelService.broadcastFilter(session, msg, opts.filterParam)
        ) {
          return;
        }

        this.enqueue(session, msg);
      });
    }
  }

  protected doBatchPush(msg: any, recvs: number[]) {
    let sessionService = this.app.get("sessionService");
    let session;
    for (let i = 0, l = recvs.length; i < l; i++) {
      session = sessionService.get(recvs[i]);
      if (session) {
        this.enqueue(session, msg);
      }
    }
  }

  protected enqueue(session: Session, msg: any) {
    let queue = this.sessions[session.id];
    if (!queue) {
      queue = this.sessions[session.id] = [];
      session.once("closed", () => this.onClose(session));
    }

    queue.push(msg);
  }

  protected onClose(session: Session) {
    delete this.sessions[session.id];
  }

  protected flush() {
    let sessionService = this.app.get("sessionService");
    let queue, session;
    for (let sid in this.sessions) {
      session = sessionService.get(<any>sid);
      if (!session) {
        continue;
      }

      queue = this.sessions[sid];
      if (!queue || queue.length === 0) {
        continue;
      }

      session.sendBatch(queue);
      this.sessions[sid] = [];
    }
  }
}
