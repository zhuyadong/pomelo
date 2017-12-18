import { Application } from "../index";

var logger = require('pomelo-logger');

export function configure(app:Application, filename:string) {
  var serverId = app.serverId;
  var base = app.base;
  logger.configure(filename, {serverId: serverId, base: base});
}
