import { Application } from "../../../application";


export class ChannelRemote {
    constructor(public readonly app:Application) {
    }

    pushMessage(route:string, msg:any, uids:string[], opts:any, cb?:Function) {

    }
}

export default (app:Application) => {
    return new ChannelRemote(app);
}