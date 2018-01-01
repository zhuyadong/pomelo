"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const logger = require("pomelo-logger").getLogger("forward-log", __filename);
class MsgRemote {
    constructor(app) {
        this.app = app;
    }
    forwardMessage(msg, session, cb) {
        let server = this.app.components.__server__;
        let sessionService = this.app.components.__backendSession__;
        if (!server) {
            logger.error("server component not enable on %s", this.app.serverId);
            index_1.utils.invokeCallback(cb, new Error("server component not enable"));
            return;
        }
        if (!sessionService) {
            logger.error("backend session component not enable on %s", this.app.serverId);
            index_1.utils.invokeCallback(cb, new Error("backend sesssion component not enable"));
            return;
        }
        // generate backend session for current request
        let backendSession = sessionService.create(session);
        // handle the request
        logger.debug("backend server [%s] handle message: %j", this.app.serverId, msg);
        server.handle(msg, backendSession, (err, resp, opts) => {
            // cb && cb(err, resp, opts);
            index_1.utils.invokeCallback(cb, err, resp, opts);
        });
    }
    forwardMessage2(route, body, aesPassword, compressGzip, session, cb) {
        let server = this.app.components.__server__;
        let sessionService = this.app.components.__backendSession__;
        if (!server) {
            logger.error("server component not enable on %s", this.app.serverId);
            index_1.utils.invokeCallback(cb, new Error("server component not enable"));
            return;
        }
        if (!sessionService) {
            logger.error("backend session component not enable on %s", this.app.serverId);
            index_1.utils.invokeCallback(cb, new Error("backend sesssion component not enable"));
            return;
        }
        // generate backend session for current request
        let backendSession = sessionService.create(session);
        // handle the request
        // logger.debug('backend server [%s] handle message: %j', this.app.serverId, msg);
        let dmsg = {
            route: route,
            body: body,
            compressGzip: compressGzip
        };
        let socket = {
            aesPassword: aesPassword
        };
        let connector = this.app.components.__connector__.connector;
        connector.runDecode(dmsg, socket, (err, msg) => {
            if (err) {
                return cb(err);
            }
            server.handle(msg, backendSession, (err, resp, opts) => {
                index_1.utils.invokeCallback(cb, err, resp, opts);
            });
        });
    }
}
exports.MsgRemote = MsgRemote;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNnUmVtb3RlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1zZ1JlbW90ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwQ0FBNkQ7QUFDN0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFFN0U7SUFDRSxZQUFxQixHQUFnQjtRQUFoQixRQUFHLEdBQUgsR0FBRyxDQUFhO0lBQUcsQ0FBQztJQUN6QyxjQUFjLENBQUMsR0FBUSxFQUFFLE9BQWdCLEVBQUUsRUFBWTtRQUNyRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7UUFFNUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLGFBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsNENBQTRDLEVBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNsQixDQUFDO1lBQ0YsYUFBSyxDQUFDLGNBQWMsQ0FDbEIsRUFBRSxFQUNGLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQ25ELENBQUM7WUFDRixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEQscUJBQXFCO1FBRXJCLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysd0NBQXdDLEVBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUNqQixHQUFHLENBQ0osQ0FBQztRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQ1gsR0FBRyxFQUNFLGNBQWMsRUFDbkIsQ0FBQyxHQUFRLEVBQUUsSUFBUyxFQUFFLElBQVMsRUFBRSxFQUFFO1lBQ2pDLDZCQUE2QjtZQUM3QixhQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWUsQ0FDYixLQUFhLEVBQ2IsSUFBUyxFQUNULFdBQW1CLEVBQ25CLFlBQXFCLEVBQ3JCLE9BQWdCLEVBQ2hCLEVBQVk7UUFFWixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7UUFFNUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLGFBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsNENBQTRDLEVBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNsQixDQUFDO1lBQ0YsYUFBSyxDQUFDLGNBQWMsQ0FDbEIsRUFBRSxFQUNGLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQ25ELENBQUM7WUFDRixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEQscUJBQXFCO1FBRXJCLGtGQUFrRjtRQUVsRixJQUFJLElBQUksR0FBRztZQUNULEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixZQUFZLEVBQUUsWUFBWTtTQUMzQixDQUFDO1FBRUYsSUFBSSxNQUFNLEdBQUc7WUFDWCxXQUFXLEVBQUUsV0FBVztTQUN6QixDQUFDO1FBRUYsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztRQUN0RCxTQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFRLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLENBQUM7WUFFRCxNQUFNLENBQUMsTUFBTSxDQUNYLEdBQUcsRUFDRSxjQUFjLEVBQ25CLENBQUMsR0FBUSxFQUFFLElBQVMsRUFBRSxJQUFTLEVBQUUsRUFBRTtnQkFDakMsYUFBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQ0YsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUdELDhCQTBHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcGxpY2F0aW9uLCB1dGlscywgU2Vzc2lvbiB9IGZyb20gXCIuLi8uLi8uLi9pbmRleFwiO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZShcInBvbWVsby1sb2dnZXJcIikuZ2V0TG9nZ2VyKFwiZm9yd2FyZC1sb2dcIiwgX19maWxlbmFtZSk7XG5cbmV4cG9ydCBjbGFzcyBNc2dSZW1vdGUge1xuICBjb25zdHJ1Y3RvcihyZWFkb25seSBhcHA6IEFwcGxpY2F0aW9uKSB7fVxuICBmb3J3YXJkTWVzc2FnZShtc2c6IGFueSwgc2Vzc2lvbjogU2Vzc2lvbiwgY2I6IEZ1bmN0aW9uKSB7XG4gICAgbGV0IHNlcnZlciA9IHRoaXMuYXBwLmNvbXBvbmVudHMuX19zZXJ2ZXJfXztcbiAgICBsZXQgc2Vzc2lvblNlcnZpY2UgPSB0aGlzLmFwcC5jb21wb25lbnRzLl9fYmFja2VuZFNlc3Npb25fXztcblxuICAgIGlmICghc2VydmVyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXCJzZXJ2ZXIgY29tcG9uZW50IG5vdCBlbmFibGUgb24gJXNcIiwgdGhpcy5hcHAuc2VydmVySWQpO1xuICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2IsIG5ldyBFcnJvcihcInNlcnZlciBjb21wb25lbnQgbm90IGVuYWJsZVwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFzZXNzaW9uU2VydmljZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBcImJhY2tlbmQgc2Vzc2lvbiBjb21wb25lbnQgbm90IGVuYWJsZSBvbiAlc1wiLFxuICAgICAgICB0aGlzLmFwcC5zZXJ2ZXJJZFxuICAgICAgKTtcbiAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKFxuICAgICAgICBjYixcbiAgICAgICAgbmV3IEVycm9yKFwiYmFja2VuZCBzZXNzc2lvbiBjb21wb25lbnQgbm90IGVuYWJsZVwiKVxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnZW5lcmF0ZSBiYWNrZW5kIHNlc3Npb24gZm9yIGN1cnJlbnQgcmVxdWVzdFxuICAgIGxldCBiYWNrZW5kU2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmNyZWF0ZShzZXNzaW9uKTtcblxuICAgIC8vIGhhbmRsZSB0aGUgcmVxdWVzdFxuXG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgXCJiYWNrZW5kIHNlcnZlciBbJXNdIGhhbmRsZSBtZXNzYWdlOiAlalwiLFxuICAgICAgdGhpcy5hcHAuc2VydmVySWQsXG4gICAgICBtc2dcbiAgICApO1xuXG4gICAgc2VydmVyLmhhbmRsZShcbiAgICAgIG1zZyxcbiAgICAgIDxhbnk+YmFja2VuZFNlc3Npb24sXG4gICAgICAoZXJyOiBhbnksIHJlc3A6IGFueSwgb3B0czogYW55KSA9PiB7XG4gICAgICAgIC8vIGNiICYmIGNiKGVyciwgcmVzcCwgb3B0cyk7XG4gICAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKGNiLCBlcnIsIHJlc3AsIG9wdHMpO1xuICAgICAgfVxuICAgICk7XG4gIH1cblxuICBmb3J3YXJkTWVzc2FnZTIoXG4gICAgcm91dGU6IHN0cmluZyxcbiAgICBib2R5OiBhbnksXG4gICAgYWVzUGFzc3dvcmQ6IHN0cmluZyxcbiAgICBjb21wcmVzc0d6aXA6IGJvb2xlYW4sXG4gICAgc2Vzc2lvbjogU2Vzc2lvbixcbiAgICBjYjogRnVuY3Rpb25cbiAgKSB7XG4gICAgbGV0IHNlcnZlciA9IHRoaXMuYXBwLmNvbXBvbmVudHMuX19zZXJ2ZXJfXztcbiAgICBsZXQgc2Vzc2lvblNlcnZpY2UgPSB0aGlzLmFwcC5jb21wb25lbnRzLl9fYmFja2VuZFNlc3Npb25fXztcblxuICAgIGlmICghc2VydmVyKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXCJzZXJ2ZXIgY29tcG9uZW50IG5vdCBlbmFibGUgb24gJXNcIiwgdGhpcy5hcHAuc2VydmVySWQpO1xuICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2IsIG5ldyBFcnJvcihcInNlcnZlciBjb21wb25lbnQgbm90IGVuYWJsZVwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCFzZXNzaW9uU2VydmljZSkge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBcImJhY2tlbmQgc2Vzc2lvbiBjb21wb25lbnQgbm90IGVuYWJsZSBvbiAlc1wiLFxuICAgICAgICB0aGlzLmFwcC5zZXJ2ZXJJZFxuICAgICAgKTtcbiAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKFxuICAgICAgICBjYixcbiAgICAgICAgbmV3IEVycm9yKFwiYmFja2VuZCBzZXNzc2lvbiBjb21wb25lbnQgbm90IGVuYWJsZVwiKVxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnZW5lcmF0ZSBiYWNrZW5kIHNlc3Npb24gZm9yIGN1cnJlbnQgcmVxdWVzdFxuICAgIGxldCBiYWNrZW5kU2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmNyZWF0ZShzZXNzaW9uKTtcblxuICAgIC8vIGhhbmRsZSB0aGUgcmVxdWVzdFxuXG4gICAgLy8gbG9nZ2VyLmRlYnVnKCdiYWNrZW5kIHNlcnZlciBbJXNdIGhhbmRsZSBtZXNzYWdlOiAlaicsIHRoaXMuYXBwLnNlcnZlcklkLCBtc2cpO1xuXG4gICAgbGV0IGRtc2cgPSB7XG4gICAgICByb3V0ZTogcm91dGUsXG4gICAgICBib2R5OiBib2R5LFxuICAgICAgY29tcHJlc3NHemlwOiBjb21wcmVzc0d6aXBcbiAgICB9O1xuXG4gICAgbGV0IHNvY2tldCA9IHtcbiAgICAgIGFlc1Bhc3N3b3JkOiBhZXNQYXNzd29yZFxuICAgIH07XG5cbiAgICBsZXQgY29ubmVjdG9yID0gdGhpcy5hcHAuY29tcG9uZW50cy5fX2Nvbm5lY3Rvcl9fLmNvbm5lY3RvcjtcbiAgICAoPGFueT5jb25uZWN0b3IpLnJ1bkRlY29kZShkbXNnLCBzb2NrZXQsIChlcnI6IGFueSwgbXNnOiBhbnkpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNiKGVycik7XG4gICAgICB9XG5cbiAgICAgIHNlcnZlci5oYW5kbGUoXG4gICAgICAgIG1zZyxcbiAgICAgICAgPGFueT5iYWNrZW5kU2Vzc2lvbixcbiAgICAgICAgKGVycjogYW55LCByZXNwOiBhbnksIG9wdHM6IGFueSkgPT4ge1xuICAgICAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKGNiLCBlcnIsIHJlc3AsIG9wdHMpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pO1xuICB9XG59XG4iXX0=