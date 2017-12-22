import { MasterComponent, Application } from "../index";

export = (app: Application, opts?: any) => {
  return new MasterComponent(app, opts);
};
