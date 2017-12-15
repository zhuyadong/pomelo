import { BackendSessionService } from '../common/service/backendSessionService';
import pomelo = require('../pomelo');
import { Application } from '../application';

export default (app:Application) => {
    let service = new BackendSessionService(app);
    app.set('backendSessionService', service);
    return service;
}