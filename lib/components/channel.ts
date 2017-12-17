import { Application } from "../application";
import {
	ChannelService,
	ChannelServiceOpts
} from "../common/service/channelService";
export default (app: Application, opts: ChannelServiceOpts) => {
	let service = new ChannelService(app, opts);
	app.set("channelService", service);
	return service;
};
