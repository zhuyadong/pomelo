const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const admin = require("pomelo-admin");
import moduleUtil = require("../util/moduleUtil");
import utils = require("../util/utils");
import { Application, ServerInfo, Module } from "../application";
import { RESERVED } from "../util/constants";

export default class Monitor {
	private serverInfo: ServerInfo;
	private masterInfo: ServerInfo;
	private modules: Module[];
	private closeWatcher: boolean;
	private monitorConsole: any; //TODO
	constructor(readonly app: Application, opts?: any) {
		opts = opts || {};
		this.app = app;
		this.serverInfo = app.curServer;
		this.masterInfo = app.master;
		this.modules = [];
		this.closeWatcher = opts.closeWatcher;

		this.monitorConsole = admin.createMonitorConsole({
			id: this.serverInfo.id,
			type: this.app.serverType,
			host: this.masterInfo.host,
			port: this.masterInfo.port,
			info: this.serverInfo,
			env: this.app.get(RESERVED.ENV),
			authServer: app.get("adminAuthServerMonitor") // auth server function
		});
	}

	start(cb: Function) {
		moduleUtil.registerDefaultModules(false, this.app, this.closeWatcher);
		this.startConsole(cb);
	}

	startConsole(cb: Function) {
		moduleUtil.loadModules(this, this.monitorConsole);

		this.monitorConsole.start((err: any) => {
			if (err) {
				utils.invokeCallback(cb, err);
				return;
			}
			moduleUtil.startModules(this.modules, (err: any) => {
				utils.invokeCallback(cb, err);
				return;
			});
		});

		this.monitorConsole.on("error", (err: any) => {
			if (!!err) {
				logger.error(
					"monitorConsole encounters with error: %j",
					err.stack
				);
				return;
			}
		});
	}

	stop(cb: Function) {
		this.monitorConsole.stop();
		this.modules = [];
		process.nextTick(function() {
			utils.invokeCallback(cb);
		});
	}

	// monitor reconnect to master
	reconnect(masterInfo: ServerInfo) {
		this.stop(() => {
			this.monitorConsole = admin.createMonitorConsole({
				id: this.serverInfo.id,
				type: this.app.serverType,
				host: masterInfo.host,
				port: masterInfo.port,
				info: this.serverInfo,
				env: this.app.get(RESERVED.ENV)
			});
			this.startConsole(() => {
				logger.info(
					"restart modules for server : %j finish.",
					this.app.serverId
				);
			});
		});
	}
}
