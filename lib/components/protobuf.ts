import { Component, Application, ProtobufComponent } from "../index";

export = (app: Application, opts?: any) => {
  return new ProtobufComponent(app, opts);
};
