import { Application, BackendSessionService } from "../index";

export = (app:Application) => {
    let service = new BackendSessionService(app);
    app.set('backendSessionService', service);
    return service;
}