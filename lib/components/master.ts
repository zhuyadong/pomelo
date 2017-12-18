import { Application, Component } from "../application";
import Master from "../master/master";

export default function(app: Application, opts?: any) {
	return new MasterComponent(app, opts);
}

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
