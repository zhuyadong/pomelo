import { Application, ChannelServiceOpts, ChannelService } from "../index";

export = (app: Application, opts: ChannelServiceOpts) => {
	let service = new ChannelService(app, opts);
	app.set("channelService", service);
	return service;
};
