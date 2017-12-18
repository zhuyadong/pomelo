import Monitor from "../monitor/monitor";
import { Application, Component, ServerInfo } from "../application";

export default function(app: Application, opts?: any) {
	return new MonitorComponent(app, opts);
}

export class MonitorComponent implements Component {
	readonly name = "__monitor__";
	private monitor: Monitor;
	constructor(app: Application, opts?: any) {
		this.monitor = new Monitor(app, opts);
	}

	start(cb: Function) {
		this.monitor.start(cb);
	}

	stop(force: boolean, cb: Function) {
		this.monitor.stop(cb);
	}

	reconnect(masterInfo: ServerInfo) {
		this.monitor.reconnect(masterInfo);
	}
}
