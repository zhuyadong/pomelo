import fs = require("fs");
import utils = require("../../util/utils");
const Loader = require("pomelo-loader");
import pathUtil = require("../../util/pathUtil");
import { Application } from "../../application";
import { Session, FrontendSession } from "./sessionService";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
const forwardLogger = require("pomelo-logger").getLogger(
	"forward-log",
	__filename
);

export type Handler = { [idx: string]: Function };
export type Handlers = { [idx: string]: Handler };
export type HandlersMap = { [idx: string]: Handlers };
export interface RouteRecord {
	serverType: string;
	route: string;
	handler: string;
	method: string;
}

export class HandlerService {
	readonly name: string;
	private handlersMap: HandlersMap;
	private enableForwardLog: boolean;
	constructor(public readonly app: Application, opts?: any) {
		this.handlersMap = {};
		if (!!opts.reloadHandlers) {
			watchHandlers(app, this.handlersMap);
		}

		this.enableForwardLog = opts.enableForwardLog || false;

		this.name = "handler";
	}

	handle(
		routeRecord: RouteRecord,
		msg: any,
		session: FrontendSession,
		cb?: Function
	) {
		// the request should be processed by current server
		let handler = this.getHandler(routeRecord);
		if (!handler) {
			logger.error(
				"[handleManager]: fail to find handler for %j",
				msg.__route__
			);
			utils.invokeCallback(
				cb!,
				new Error("fail to find handler for " + msg.__route__)
			);
			return;
		}
		let start = Date.now();
		let self = this;

		let callback = (err: any, resp: any, opts: any) => {
			if (self.enableForwardLog) {
				let log = {
					route: msg.__route__,
					args: msg,
					time: utils.format(new Date(start)),
					timeUsed: Date.now() - start
				};
				forwardLogger.info(JSON.stringify(log));
			}

			// resp = getResp(arguments);
			utils.invokeCallback(cb!, err, resp, opts);
		};

		let method = routeRecord.method;

		if (!Array.isArray(msg)) {
			handler[method](msg, session, callback);
		} else {
			msg.push(session);
			msg.push(callback);
			handler[method].apply(handler, msg);
		}
		return;
	}

	getHandler(routeRecord: RouteRecord) {
		let serverType = routeRecord.serverType;
		if (!this.handlersMap[serverType]) {
			loadHandlers(this.app, serverType, this.handlersMap);
		}
		let handlers = this.handlersMap[serverType] || {};
		let handler = handlers[routeRecord.handler];
		if (!handler) {
			logger.warn(
				"could not find handler for routeRecord: %j",
				routeRecord
			);
			return null;
		}
		if (typeof handler[routeRecord.method] !== "function") {
			logger.warn(
				"could not find the method %s in handler: %s",
				routeRecord.method,
				routeRecord.handler
			);
			return null;
		}
		return handler;
	}
}

function loadHandlers(
	app: Application,
	serverType: string,
	handlersMap: HandlersMap
) {
	let p = pathUtil.getHandlerPath(app.base, serverType);
	if (p) {
		handlersMap[serverType] = Loader.load(p, app);
	}
}

function watchHandlers(app: Application, handlersMap: HandlersMap) {
	let p = pathUtil.getHandlerPath(app.base, app.serverType);
	if (!!p) {
		fs.watch(p, (event, name) => {
			if (event === "change") {
				handlersMap[app.serverType] = Loader.load(p, app);
			}
		});
	}
}

function getResp(args: any[]) {
	let len = args.length;
	if (len == 1) {
		return [];
	}

	if (len == 2) {
		return [args[1]];
	}

	if (len == 3) {
		return [args[1], args[2]];
	}

	if (len == 4) {
		return [args[1], args[2], args[3]];
	}

	let r = new Array(len);
	for (let i = 1; i < len; i++) {
		r[i] = args[i];
	}

	return r;
}
