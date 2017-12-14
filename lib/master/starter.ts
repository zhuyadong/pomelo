import { Application, ServerInfo } from '../application';
import { RESERVED } from "../util/constants";

export function runServers(app: Application) {
  var server, servers;
  var condition = app.startId || app.type;
  switch (condition) {
    case RESERVED.MASTER:
      break;
    case RESERVED.ALL:
      servers = app.getServersFromConfig();
      for (var serverId in servers) {
        this.run(app, servers[serverId]);
      }
      break;
    default:
      server = app.getServerFromConfig(condition);
      if (!!server) {
        this.run(app, server);
      } else {
        servers = app.get(Constants.RESERVED.SERVERS)[condition];
        for (var i = 0; i < servers.length; i++) {
          this.run(app, servers[i]);
        }
      }
  }
}

export function run(app:Application, server:ServerInfo, cb?:Function) {

}