import { Application, Connector, ConnectorComponent } from "../index";

export = (app: Application, opts?: { connector?: Connector }) => {
  return new ConnectorComponent(app, opts);
};
