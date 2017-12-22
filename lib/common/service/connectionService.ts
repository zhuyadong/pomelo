import { Application } from "../../application";
import { Component } from "../../index";

/*
export interface IConnectionService {
  addLoginedUser(uid: string, info: any):void;
  updateUserInfo(uid: string, info: any):void;
  increaseConnectionCount():void;
  removeLoginedUser(uid: string):void;
  decreaseConnectionCount(uid: string):void;
  getStatisticsInfo():{
      serverId: string;
      totalConnCount: number;
      loginedCount: number;
      loginedList: any[];
  };
}
*/

export class ConnectionService {
  readonly serverId: string;

  private _connCount: number;
  get connCount() {
    return this._connCount;
  }

  private _loginedCount: number;
  get loginedCount() {
    return this._loginedCount;
  }

  private _logined: { [idx: string]: any };
  constructor(app: Application) {
    this.serverId = app.serverId;
    this._connCount = 0;
    this._loginedCount = 0;
    this._logined = {};
  }

  addLoginedUser(uid: string, info: any) {
    if (!this._logined[uid]) {
      this._loginedCount++;
    }
    info.uid = uid;
    this._logined[uid] = info;
  }

  updateUserInfo(uid: string, info: any) {
    let user = this._logined[uid];
    if (!user) {
      return;
    }

    for (let p in info) {
      if (info.hasOwnProperty(p) && typeof info[p] !== "function") {
        user[p] = info[p];
      }
    }
  }

  increaseConnectionCount() {
    this._connCount++;
  }
  removeLoginedUser(uid: string) {
    if (!!this._logined[uid]) {
      this._loginedCount--;
    }
    delete this._logined[uid];
  }

  decreaseConnectionCount(uid: string) {
    if (this._connCount) {
      this._connCount--;
    }
    if (!!uid) {
      this.removeLoginedUser(uid);
    }
  }
  getStatisticsInfo() {
    let list = [];
    for (let uid in this._logined) {
      list.push(this._logined[uid]);
    }

    return {
      serverId: this.serverId,
      totalConnCount: this.connCount,
      loginedCount: this.loginedCount,
      loginedList: list
    };
  }
}

export class ConnectionComponent implements Component {
	readonly name: string;
	readonly service: ConnectionService;
	constructor(readonly app: Application) {
		this.service = new ConnectionService(app);
		this.name = "__connection__";
	}
	addLoginedUser(uid: string, info: any) {
		this.service.addLoginedUser(uid, info);
	}
	updateUserInfo(uid: string, info: any) {
		this.service.updateUserInfo(uid, info);
	}
	increaseConnectionCount() {
		this.service.increaseConnectionCount();
	}
	removeLoginedUser(uid: string) {
		this.service.removeLoginedUser(uid);
	}
	decreaseConnectionCount(uid: string) {
		this.service.decreaseConnectionCount(uid);
	}
	getStatisticsInfo() {
		return this.service.getStatisticsInfo();
	}
}