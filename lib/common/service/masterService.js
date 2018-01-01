"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
class MasterComponent {
    constructor(app, opts) {
        this.app = app;
        this.name = "__master__";
        this.master = new index_1.Master(app, opts);
    }
    start(cb) {
        this.master.start(cb);
    }
    stop(force, cb) {
        this.master.stop(cb);
    }
}
exports.MasterComponent = MasterComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFzdGVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hc3RlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBNkQ7QUFFN0Q7SUFHRSxZQUFxQixHQUFnQixFQUFFLElBQVU7UUFBNUIsUUFBRyxHQUFILEdBQUcsQ0FBYTtRQUY1QixTQUFJLEdBQUcsWUFBWSxDQUFDO1FBRzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxjQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxLQUFLLENBQUMsRUFBWTtRQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsSUFBSSxDQUFDLEtBQWMsRUFBRSxFQUFZO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7Q0FDRjtBQWJELDBDQWFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBNYXN0ZXIsIEFwcGxpY2F0aW9uIH0gZnJvbSBcIi4uLy4uL2luZGV4XCI7XG5cbmV4cG9ydCBjbGFzcyBNYXN0ZXJDb21wb25lbnQgaW1wbGVtZW50cyBDb21wb25lbnQge1xuICByZWFkb25seSBuYW1lID0gXCJfX21hc3Rlcl9fXCI7XG4gIHByaXZhdGUgbWFzdGVyOiBNYXN0ZXI7XG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IGFwcDogQXBwbGljYXRpb24sIG9wdHM/OiBhbnkpIHtcbiAgICB0aGlzLm1hc3RlciA9IG5ldyBNYXN0ZXIoYXBwLCBvcHRzKTtcbiAgfVxuICBzdGFydChjYjogRnVuY3Rpb24pIHtcbiAgICB0aGlzLm1hc3Rlci5zdGFydChjYik7XG4gIH1cblxuICBzdG9wKGZvcmNlOiBib29sZWFuLCBjYjogRnVuY3Rpb24pIHtcbiAgICB0aGlzLm1hc3Rlci5zdG9wKGNiKTtcbiAgfVxufVxuIl19