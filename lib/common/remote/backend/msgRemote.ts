import Application from "../../../application";
import { MsgRemote } from "../../service/msgRemoteService";
let { getOwnPropertyNames, getPrototypeOf } = Object;

export = (app: Application) => {
  let self = <any>new MsgRemote(app);
  for (let key of getOwnPropertyNames(getPrototypeOf(self))) {
    if (key !== "constructor" && typeof self[key] === "function") {
      self[key] = self[key].bind(self);
    }
  }
  return self;
  //return new MsgRemote(app);
};
