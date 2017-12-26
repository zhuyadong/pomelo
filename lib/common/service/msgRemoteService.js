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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXNnUmVtb3RlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1zZ1JlbW90ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwQ0FBNkQ7QUFDN0QsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFFN0U7SUFDRSxZQUFxQixHQUFnQjtRQUFoQixRQUFHLEdBQUgsR0FBRyxDQUFhO0lBQUcsQ0FBQztJQUN6QyxjQUFjLENBQUMsR0FBUSxFQUFFLE9BQWdCLEVBQUUsRUFBWTtRQUNyRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7UUFFNUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLGFBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsNENBQTRDLEVBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNsQixDQUFDO1lBQ0YsYUFBSyxDQUFDLGNBQWMsQ0FDbEIsRUFBRSxFQUNGLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQ25ELENBQUM7WUFDRixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEQscUJBQXFCO1FBRXJCLE1BQU0sQ0FBQyxLQUFLLENBQ1Ysd0NBQXdDLEVBQ3hDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUNqQixHQUFHLENBQ0osQ0FBQztRQUVGLE1BQU0sQ0FBQyxNQUFNLENBQ1gsR0FBRyxFQUNFLGNBQWMsRUFDbkIsQ0FBQyxHQUFRLEVBQUUsSUFBUyxFQUFFLElBQVMsRUFBRSxFQUFFO1lBQ2pDLDZCQUE2QjtZQUM3QixhQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWUsQ0FDYixLQUFhLEVBQ2IsSUFBUyxFQUNULFdBQW1CLEVBQ25CLFlBQXFCLEVBQ3JCLE9BQWdCLEVBQ2hCLEVBQVk7UUFFWixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7UUFDNUMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUM7UUFFNUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1osTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JFLGFBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsNENBQTRDLEVBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUNsQixDQUFDO1lBQ0YsYUFBSyxDQUFDLGNBQWMsQ0FDbEIsRUFBRSxFQUNGLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQ25ELENBQUM7WUFDRixNQUFNLENBQUM7UUFDVCxDQUFDO1FBRUQsK0NBQStDO1FBQy9DLElBQUksY0FBYyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFcEQscUJBQXFCO1FBRXJCLGtGQUFrRjtRQUVsRixJQUFJLElBQUksR0FBRztZQUNULEtBQUssRUFBRSxLQUFLO1lBQ1osSUFBSSxFQUFFLElBQUk7WUFDVixZQUFZLEVBQUUsWUFBWTtTQUMzQixDQUFDO1FBRUYsSUFBSSxNQUFNLEdBQUc7WUFDWCxXQUFXLEVBQUUsV0FBVztTQUN6QixDQUFDO1FBRUYsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQztRQUN0RCxTQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxHQUFRLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDUixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLENBQUM7WUFFRCxNQUFNLENBQUMsTUFBTSxDQUNYLEdBQUcsRUFDRSxjQUFjLEVBQ25CLENBQUMsR0FBUSxFQUFFLElBQVMsRUFBRSxJQUFTLEVBQUUsRUFBRTtnQkFDakMsYUFBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM1QyxDQUFDLENBQ0YsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUdELDhCQTBHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcGxpY2F0aW9uLCB1dGlscywgU2Vzc2lvbiB9IGZyb20gXCIuLi8uLi8uLi9pbmRleFwiO1xyXG5jb25zdCBsb2dnZXIgPSByZXF1aXJlKFwicG9tZWxvLWxvZ2dlclwiKS5nZXRMb2dnZXIoXCJmb3J3YXJkLWxvZ1wiLCBfX2ZpbGVuYW1lKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBNc2dSZW1vdGUge1xyXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGFwcDogQXBwbGljYXRpb24pIHt9XHJcbiAgZm9yd2FyZE1lc3NhZ2UobXNnOiBhbnksIHNlc3Npb246IFNlc3Npb24sIGNiOiBGdW5jdGlvbikge1xyXG4gICAgbGV0IHNlcnZlciA9IHRoaXMuYXBwLmNvbXBvbmVudHMuX19zZXJ2ZXJfXztcclxuICAgIGxldCBzZXNzaW9uU2VydmljZSA9IHRoaXMuYXBwLmNvbXBvbmVudHMuX19iYWNrZW5kU2Vzc2lvbl9fO1xyXG5cclxuICAgIGlmICghc2VydmVyKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihcInNlcnZlciBjb21wb25lbnQgbm90IGVuYWJsZSBvbiAlc1wiLCB0aGlzLmFwcC5zZXJ2ZXJJZCk7XHJcbiAgICAgIHV0aWxzLmludm9rZUNhbGxiYWNrKGNiLCBuZXcgRXJyb3IoXCJzZXJ2ZXIgY29tcG9uZW50IG5vdCBlbmFibGVcIikpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFzZXNzaW9uU2VydmljZSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoXHJcbiAgICAgICAgXCJiYWNrZW5kIHNlc3Npb24gY29tcG9uZW50IG5vdCBlbmFibGUgb24gJXNcIixcclxuICAgICAgICB0aGlzLmFwcC5zZXJ2ZXJJZFxyXG4gICAgICApO1xyXG4gICAgICB1dGlscy5pbnZva2VDYWxsYmFjayhcclxuICAgICAgICBjYixcclxuICAgICAgICBuZXcgRXJyb3IoXCJiYWNrZW5kIHNlc3NzaW9uIGNvbXBvbmVudCBub3QgZW5hYmxlXCIpXHJcbiAgICAgICk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBnZW5lcmF0ZSBiYWNrZW5kIHNlc3Npb24gZm9yIGN1cnJlbnQgcmVxdWVzdFxyXG4gICAgbGV0IGJhY2tlbmRTZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuY3JlYXRlKHNlc3Npb24pO1xyXG5cclxuICAgIC8vIGhhbmRsZSB0aGUgcmVxdWVzdFxyXG5cclxuICAgIGxvZ2dlci5kZWJ1ZyhcclxuICAgICAgXCJiYWNrZW5kIHNlcnZlciBbJXNdIGhhbmRsZSBtZXNzYWdlOiAlalwiLFxyXG4gICAgICB0aGlzLmFwcC5zZXJ2ZXJJZCxcclxuICAgICAgbXNnXHJcbiAgICApO1xyXG5cclxuICAgIHNlcnZlci5oYW5kbGUoXHJcbiAgICAgIG1zZyxcclxuICAgICAgPGFueT5iYWNrZW5kU2Vzc2lvbixcclxuICAgICAgKGVycjogYW55LCByZXNwOiBhbnksIG9wdHM6IGFueSkgPT4ge1xyXG4gICAgICAgIC8vIGNiICYmIGNiKGVyciwgcmVzcCwgb3B0cyk7XHJcbiAgICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soY2IsIGVyciwgcmVzcCwgb3B0cyk7XHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBmb3J3YXJkTWVzc2FnZTIoXHJcbiAgICByb3V0ZTogc3RyaW5nLFxyXG4gICAgYm9keTogYW55LFxyXG4gICAgYWVzUGFzc3dvcmQ6IHN0cmluZyxcclxuICAgIGNvbXByZXNzR3ppcDogYm9vbGVhbixcclxuICAgIHNlc3Npb246IFNlc3Npb24sXHJcbiAgICBjYjogRnVuY3Rpb25cclxuICApIHtcclxuICAgIGxldCBzZXJ2ZXIgPSB0aGlzLmFwcC5jb21wb25lbnRzLl9fc2VydmVyX187XHJcbiAgICBsZXQgc2Vzc2lvblNlcnZpY2UgPSB0aGlzLmFwcC5jb21wb25lbnRzLl9fYmFja2VuZFNlc3Npb25fXztcclxuXHJcbiAgICBpZiAoIXNlcnZlcikge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoXCJzZXJ2ZXIgY29tcG9uZW50IG5vdCBlbmFibGUgb24gJXNcIiwgdGhpcy5hcHAuc2VydmVySWQpO1xyXG4gICAgICB1dGlscy5pbnZva2VDYWxsYmFjayhjYiwgbmV3IEVycm9yKFwic2VydmVyIGNvbXBvbmVudCBub3QgZW5hYmxlXCIpKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghc2Vzc2lvblNlcnZpY2UpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKFxyXG4gICAgICAgIFwiYmFja2VuZCBzZXNzaW9uIGNvbXBvbmVudCBub3QgZW5hYmxlIG9uICVzXCIsXHJcbiAgICAgICAgdGhpcy5hcHAuc2VydmVySWRcclxuICAgICAgKTtcclxuICAgICAgdXRpbHMuaW52b2tlQ2FsbGJhY2soXHJcbiAgICAgICAgY2IsXHJcbiAgICAgICAgbmV3IEVycm9yKFwiYmFja2VuZCBzZXNzc2lvbiBjb21wb25lbnQgbm90IGVuYWJsZVwiKVxyXG4gICAgICApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZ2VuZXJhdGUgYmFja2VuZCBzZXNzaW9uIGZvciBjdXJyZW50IHJlcXVlc3RcclxuICAgIGxldCBiYWNrZW5kU2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmNyZWF0ZShzZXNzaW9uKTtcclxuXHJcbiAgICAvLyBoYW5kbGUgdGhlIHJlcXVlc3RcclxuXHJcbiAgICAvLyBsb2dnZXIuZGVidWcoJ2JhY2tlbmQgc2VydmVyIFslc10gaGFuZGxlIG1lc3NhZ2U6ICVqJywgdGhpcy5hcHAuc2VydmVySWQsIG1zZyk7XHJcblxyXG4gICAgbGV0IGRtc2cgPSB7XHJcbiAgICAgIHJvdXRlOiByb3V0ZSxcclxuICAgICAgYm9keTogYm9keSxcclxuICAgICAgY29tcHJlc3NHemlwOiBjb21wcmVzc0d6aXBcclxuICAgIH07XHJcblxyXG4gICAgbGV0IHNvY2tldCA9IHtcclxuICAgICAgYWVzUGFzc3dvcmQ6IGFlc1Bhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIGxldCBjb25uZWN0b3IgPSB0aGlzLmFwcC5jb21wb25lbnRzLl9fY29ubmVjdG9yX18uY29ubmVjdG9yO1xyXG4gICAgKDxhbnk+Y29ubmVjdG9yKS5ydW5EZWNvZGUoZG1zZywgc29ja2V0LCAoZXJyOiBhbnksIG1zZzogYW55KSA9PiB7XHJcbiAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICByZXR1cm4gY2IoZXJyKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgc2VydmVyLmhhbmRsZShcclxuICAgICAgICBtc2csXHJcbiAgICAgICAgPGFueT5iYWNrZW5kU2Vzc2lvbixcclxuICAgICAgICAoZXJyOiBhbnksIHJlc3A6IGFueSwgb3B0czogYW55KSA9PiB7XHJcbiAgICAgICAgICB1dGlscy5pbnZva2VDYWxsYmFjayhjYiwgZXJyLCByZXNwLCBvcHRzKTtcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19