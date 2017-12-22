import { Application, ServerComponent } from "../index";

export = (app: Application, opts?: any)=> {
  return new ServerComponent(app, opts);
}