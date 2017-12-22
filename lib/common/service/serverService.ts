import { Server, Application, FrontendSession } from "../../index";

export class ServerComponent {
  readonly server: Server;
  readonly name = "__server__";
  constructor(app: Application, opts?: any) {
    this.server = new Server(app, opts);
  }

  start(cb: Function) {
    this.server.start();
    process.nextTick(cb);
  }

  afterStart(cb: Function) {
    this.server.afterStart();
    process.nextTick(cb);
  }

  stop(force: boolean, cb: Function) {
    this.server.stop();
    process.nextTick(cb);
  }
  handle(msg: any, session: FrontendSession, cb: Function) {
    this.server.handle(msg, session, cb);
  }

  globalHandle(msg: any, session: FrontendSession, cb: Function) {
    this.server.globalHandle(msg, session, cb);
  }
}
