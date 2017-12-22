import { Component, Master, Application } from "../../index";

export class MasterComponent implements Component {
  readonly name = "__master__";
  private master: Master;
  constructor(readonly app: Application, opts?: any) {
    this.master = new Master(app, opts);
  }
  start(cb: Function) {
    this.master.start(cb);
  }

  stop(force: boolean, cb: Function) {
    this.master.stop(cb);
  }
}
