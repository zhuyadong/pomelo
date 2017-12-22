import fs = require("fs");
import path = require("path");
import crypto = require("crypto");

import { Component, Application, pathUtil, utils } from "../../index";

const Loader = require("pomelo-loader");

export class DictionaryComponent implements Component {
	readonly name = "__dictionary__";
	readonly userDicPath: string;
	readonly version: string;
	private dict: { [idx: string]: number };
	private abbrs: { [idx: number]: string };
	constructor(readonly app: Application, opts?: any) {
		this.dict = {};
		this.abbrs = {};
		this.userDicPath = <any>null;
		this.version = "";
		//Set user dictionary
		let p = path.join(app.base, "/config/dictionary.json");
		if (!!opts && !!opts.dict) {
			p = opts.dict;
		}
		if (fs.existsSync(p)) {
			this.userDicPath = p;
		}
	}
	start(cb?: Function) {
		let servers = this.app.get("servers");
		let routes: string[] = [];

		//Load all the handler files
		for (let serverType in servers) {
			let p = pathUtil.getHandlerPath(this.app.base, serverType);
			if (!p) {
				continue;
			}

			let handlers = Loader.load(p, this.app);

			for (let name in handlers) {
				let handler = handlers[name];
				for (let key in handler) {
					if (typeof handler[key] === "function") {
						routes.push(serverType + "." + name + "." + key);
					}
				}
			}
		}

		//Sort the route to make sure all the routers abbr are the same in all the servers
		routes.sort();
		for (let i = 0; i < routes.length; i++) {
			let abbr = i + 1;
			this.abbrs[abbr] = routes[i];
			this.dict[routes[i]] = abbr;
		}

		//Load user dictionary
		if (!!this.userDicPath) {
			let userDic = require(this.userDicPath);

			let abbr = routes.length + 1;
			for (let i = 0; i < userDic.length; i++) {
				let route = userDic[i];

				this.abbrs[abbr] = route;
				this.dict[route] = abbr;
				abbr++;
			}
		}

		this.version! = crypto
			.createHash("md5")
			.update(JSON.stringify(this.dict))
			.digest("base64");

		utils.invokeCallback(cb!);
	}

	getDict(): Readonly<{ [idx: string]: number }> {
		return this.dict;
	}

	getAbbrs(): Readonly<{ [idx: number]: string }> {
		return this.abbrs;
	}

	getVersion() {
		return this.version;
	}
}
