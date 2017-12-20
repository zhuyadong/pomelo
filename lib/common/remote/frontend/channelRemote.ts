import utils = require("../../../util/utils");
import { Application } from "../../../../index";
const logger = require("pomelo-logger").getLogger("pomelo", __filename);

export default function(app: Application) {
  return new ChannelRemote(app);
}

export class ChannelRemote {
  constructor(readonly app: Application) {}

  pushMessage(route:string, msg:any, uids:string[], opts:any, cb:Function) {
    if (!msg) {
      logger.error(
        "Can not send empty message! route : %j, compressed msg : %j",
        route,
        msg
      );
      utils.invokeCallback(cb, new Error("can not send empty message."));
      return;
    }

    let connector = this.app.components.__connector__;

    let sessionService = this.app.get("sessionService");
    let fails:string[] = [];
    let sids:number[] = [];
    for (let i = 0, l = uids.length; i < l; i++) {
      let sessions = sessionService.getByUid(uids[i]);
      if (!sessions) {
        fails.push(uids[i]);
      } else {
        for (let j = 0, k = sessions.length; j < k; j++) {
          sids.push(sessions[j].id);
        }
      }
    }
    logger.debug(
      "[%s] pushMessage uids: %j, msg: %j, sids: %j",
      this.app.serverId,
      uids,
      msg,
      sids
    );
    connector.send(null!, route, msg, sids, opts, (err:any)=> {
      utils.invokeCallback(cb, err, fails);
    });
  }

  broadcast(route:string, msg:any, opts:any, cb:Function) {
    let connector = this.app.components.__connector__;

    connector.send(null!, route, msg, null!, opts, cb);
  }
}
