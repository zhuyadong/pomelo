import { Application, ChannelRemote } from "../../../../index";
let { getOwnPropertyNames, getPrototypeOf } = Object;

export = (app: Application) => {
  let self = <any>new ChannelRemote(app);
  for (let key of getOwnPropertyNames(getPrototypeOf(self))) {
    console.log(key);
    if (key !== "constructor" && typeof self[key] === "function") {
      self[key] = self[key].bind(self);
    }
  }
  return self;
  //return new MsgRemote(app);
};
