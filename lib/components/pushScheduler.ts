import { Application, PushSchedulerComponent } from "../index";

export = (app: Application, opts?: any) => {
  return new PushSchedulerComponent(app, opts);
};
