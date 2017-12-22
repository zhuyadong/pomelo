import { Application, MonitorComponent } from "../index";

export = (app: Application, opts?: any) => {
  return new MonitorComponent(app, opts);
};
