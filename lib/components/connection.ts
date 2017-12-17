import { ConnectionService } from "../common/service/connectionService";
import { Application, Component } from '../application';

export default (app: Application) => {
	return new ConnectionComponent(app);
};

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
