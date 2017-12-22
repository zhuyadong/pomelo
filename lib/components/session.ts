import { Component, ISocket, SessionComponent, Application } from "../";

export = (app: Application, opts?: any) => {
  var cmp = new SessionComponent(app, opts);
  app.set("sessionService", cmp);
  return cmp;
};
