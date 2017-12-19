import { BackendSessionService } from '../common/service/backendSessionService';
import pomelo = require('../pomelo');
import { Application } from '../application';
export * from '../common/service/backendSessionService';

export default (app:Application) => {
    let service = new BackendSessionService(app);
    app.set('backendSessionService', service);
    return service;
}