import { Application, RemoteComponent } from "../index";

export = (app: Application, opts?: any) => {
  opts = opts || {};

  // cacheMsg is deprecated, just for compatibility here.
  opts.bufferMsg = opts.bufferMsg || opts.cacheMsg || false;
  opts.interval = opts.interval || 30;
  if (app.enabled("rpcDebugLog")) {
    opts.rpcDebugLog = true;
    opts.rpcLogger = require("pomelo-logger").getLogger(
      "rpc-debug",
      __filename
    );
  }
  return new RemoteComponent(app, opts);
};
