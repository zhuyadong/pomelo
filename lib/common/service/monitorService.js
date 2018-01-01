"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
class MonitorComponent {
    constructor(app, opts) {
        this.name = "__monitor__";
        this.monitor = new index_1.Monitor(app, opts);
    }
    start(cb) {
        this.monitor.start(cb);
    }
    stop(force, cb) {
        this.monitor.stop(cb);
    }
    reconnect(masterInfo) {
        this.monitor.reconnect(masterInfo);
    }
}
exports.MonitorComponent = MonitorComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb25pdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUEwRTtBQUUxRTtJQUdFLFlBQVksR0FBZ0IsRUFBRSxJQUFVO1FBRi9CLFNBQUksR0FBRyxhQUFhLENBQUM7UUFHNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGVBQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELEtBQUssQ0FBQyxFQUFZO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLENBQUMsS0FBYyxFQUFFLEVBQVk7UUFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQVMsQ0FBQyxVQUFzQjtRQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0Y7QUFsQkQsNENBa0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBNb25pdG9yLCBBcHBsaWNhdGlvbiwgU2VydmVySW5mbyB9IGZyb20gXCIuLi8uLi9pbmRleFwiO1xuXG5leHBvcnQgY2xhc3MgTW9uaXRvckNvbXBvbmVudCBpbXBsZW1lbnRzIENvbXBvbmVudCB7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIl9fbW9uaXRvcl9fXCI7XG4gIHByaXZhdGUgbW9uaXRvcjogTW9uaXRvcjtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHBsaWNhdGlvbiwgb3B0cz86IGFueSkge1xuICAgIHRoaXMubW9uaXRvciA9IG5ldyBNb25pdG9yKGFwcCwgb3B0cyk7XG4gIH1cblxuICBzdGFydChjYjogRnVuY3Rpb24pIHtcbiAgICB0aGlzLm1vbml0b3Iuc3RhcnQoY2IpO1xuICB9XG5cbiAgc3RvcChmb3JjZTogYm9vbGVhbiwgY2I6IEZ1bmN0aW9uKSB7XG4gICAgdGhpcy5tb25pdG9yLnN0b3AoY2IpO1xuICB9XG5cbiAgcmVjb25uZWN0KG1hc3RlckluZm86IFNlcnZlckluZm8pIHtcbiAgICB0aGlzLm1vbml0b3IucmVjb25uZWN0KG1hc3RlckluZm8pO1xuICB9XG59XG4iXX0=