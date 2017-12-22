import { ConnectionComponent } from "../common/service/connectionService";
import { Application, Component } from '../application';

export = (app: Application) => {
	return new ConnectionComponent(app);
};
