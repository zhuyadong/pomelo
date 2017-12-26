import { Application, utils, Session } from "../../../index";
const logger = require("pomelo-logger").getLogger("forward-log", __filename);

export class MsgRemote {
  constructor(readonly app: Application) {}
  forwardMessage(msg: any, session: Session, cb: Function) {
    let server = this.app.components.__server__;
    let sessionService = this.app.components.__backendSession__;

    if (!server) {
      logger.error("server component not enable on %s", this.app.serverId);
      utils.invokeCallback(cb, new Error("server component not enable"));
      return;
    }

    if (!sessionService) {
      logger.error(
        "backend session component not enable on %s",
        this.app.serverId
      );
      utils.invokeCallback(
        cb,
        new Error("backend sesssion component not enable")
      );
      return;
    }

    // generate backend session for current request
    let backendSession = sessionService.create(session);

    // handle the request

    logger.debug(
      "backend server [%s] handle message: %j",
      this.app.serverId,
      msg
    );

    server.handle(
      msg,
      <any>backendSession,
      (err: any, resp: any, opts: any) => {
        // cb && cb(err, resp, opts);
        utils.invokeCallback(cb, err, resp, opts);
      }
    );
  }

  forwardMessage2(
    route: string,
    body: any,
    aesPassword: string,
    compressGzip: boolean,
    session: Session,
    cb: Function
  ) {
    let server = this.app.components.__server__;
    let sessionService = this.app.components.__backendSession__;

    if (!server) {
      logger.error("server component not enable on %s", this.app.serverId);
      utils.invokeCallback(cb, new Error("server component not enable"));
      return;
    }

    if (!sessionService) {
      logger.error(
        "backend session component not enable on %s",
        this.app.serverId
      );
      utils.invokeCallback(
        cb,
        new Error("backend sesssion component not enable")
      );
      return;
    }

    // generate backend session for current request
    let backendSession = sessionService.create(session);

    // handle the request

    // logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);

    let dmsg = {
      route: route,
      body: body,
      compressGzip: compressGzip
    };

    let socket = {
      aesPassword: aesPassword
    };

    let connector = this.app.components.__connector__.connector;
    (<any>connector).runDecode(dmsg, socket, (err: any, msg: any) => {
      if (err) {
        return cb(err);
      }

      server.handle(
        msg,
        <any>backendSession,
        (err: any, resp: any, opts: any) => {
          utils.invokeCallback(cb, err, resp, opts);
        }
      );
    });
  }
}
