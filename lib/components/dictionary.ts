import { Application, DictionaryComponent } from "../index";

export = (app: Application, opts?: any) => {
	return new DictionaryComponent(app, opts);
}
