"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
export interface IConnectionService {
  addLoginedUser(uid: string, info: any):void;
  updateUserInfo(uid: string, info: any):void;
  increaseConnectionCount():void;
  removeLoginedUser(uid: string):void;
  decreaseConnectionCount(uid: string):void;
  getStatisticsInfo():{
      serverId: string;
      totalConnCount: number;
      loginedCount: number;
      loginedList: any[];
  };
}
*/
class ConnectionService {
    get connCount() {
        return this._connCount;
    }
    get loginedCount() {
        return this._loginedCount;
    }
    constructor(app) {
        this.serverId = app.serverId;
        this._connCount = 0;
        this._loginedCount = 0;
        this._logined = {};
    }
    addLoginedUser(uid, info) {
        if (!this._logined[uid]) {
            this._loginedCount++;
        }
        info.uid = uid;
        this._logined[uid] = info;
    }
    updateUserInfo(uid, info) {
        let user = this._logined[uid];
        if (!user) {
            return;
        }
        for (let p in info) {
            if (info.hasOwnProperty(p) && typeof info[p] !== "function") {
                user[p] = info[p];
            }
        }
    }
    increaseConnectionCount() {
        this._connCount++;
    }
    removeLoginedUser(uid) {
        if (!!this._logined[uid]) {
            this._loginedCount--;
        }
        delete this._logined[uid];
    }
    decreaseConnectionCount(uid) {
        if (this._connCount) {
            this._connCount--;
        }
        if (!!uid) {
            this.removeLoginedUser(uid);
        }
    }
    getStatisticsInfo() {
        let list = [];
        for (let uid in this._logined) {
            list.push(this._logined[uid]);
        }
        return {
            serverId: this.serverId,
            totalConnCount: this.connCount,
            loginedCount: this.loginedCount,
            loginedList: list
        };
    }
}
exports.ConnectionService = ConnectionService;
class ConnectionComponent {
    constructor(app) {
        this.app = app;
        this.service = new ConnectionService(app);
        this.name = "__connection__";
    }
    addLoginedUser(uid, info) {
        this.service.addLoginedUser(uid, info);
    }
    updateUserInfo(uid, info) {
        this.service.updateUserInfo(uid, info);
    }
    increaseConnectionCount() {
        this.service.increaseConnectionCount();
    }
    removeLoginedUser(uid) {
        this.service.removeLoginedUser(uid);
    }
    decreaseConnectionCount(uid) {
        this.service.decreaseConnectionCount(uid);
    }
    getStatisticsInfo() {
        return this.service.getStatisticsInfo();
    }
}
exports.ConnectionComponent = ConnectionComponent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb25uZWN0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBOzs7Ozs7Ozs7Ozs7OztFQWNFO0FBRUY7SUFJRSxJQUFJLFNBQVM7UUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBR0QsSUFBSSxZQUFZO1FBQ2QsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDNUIsQ0FBQztJQUdELFlBQVksR0FBZ0I7UUFDMUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFXLEVBQUUsSUFBUztRQUNuQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNWLE1BQU0sQ0FBQztRQUNULENBQUM7UUFFRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ25CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCx1QkFBdUI7UUFDckIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxHQUFXO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsdUJBQXVCLENBQUMsR0FBVztRQUNqQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDSCxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELE1BQU0sQ0FBQztZQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDOUIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF6RUQsOENBeUVDO0FBRUQ7SUFHQyxZQUFxQixHQUFnQjtRQUFoQixRQUFHLEdBQUgsR0FBRyxDQUFhO1FBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFDRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCx1QkFBdUI7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxHQUFXO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUNELHVCQUF1QixDQUFDLEdBQVc7UUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDekMsQ0FBQztDQUNEO0FBekJELGtEQXlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIi4uLy4uL2FwcGxpY2F0aW9uXCI7XHJcbmltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gXCIuLi8uLi9pbmRleFwiO1xyXG5cclxuLypcclxuZXhwb3J0IGludGVyZmFjZSBJQ29ubmVjdGlvblNlcnZpY2Uge1xyXG4gIGFkZExvZ2luZWRVc2VyKHVpZDogc3RyaW5nLCBpbmZvOiBhbnkpOnZvaWQ7XHJcbiAgdXBkYXRlVXNlckluZm8odWlkOiBzdHJpbmcsIGluZm86IGFueSk6dm9pZDtcclxuICBpbmNyZWFzZUNvbm5lY3Rpb25Db3VudCgpOnZvaWQ7XHJcbiAgcmVtb3ZlTG9naW5lZFVzZXIodWlkOiBzdHJpbmcpOnZvaWQ7XHJcbiAgZGVjcmVhc2VDb25uZWN0aW9uQ291bnQodWlkOiBzdHJpbmcpOnZvaWQ7XHJcbiAgZ2V0U3RhdGlzdGljc0luZm8oKTp7XHJcbiAgICAgIHNlcnZlcklkOiBzdHJpbmc7XHJcbiAgICAgIHRvdGFsQ29ubkNvdW50OiBudW1iZXI7XHJcbiAgICAgIGxvZ2luZWRDb3VudDogbnVtYmVyO1xyXG4gICAgICBsb2dpbmVkTGlzdDogYW55W107XHJcbiAgfTtcclxufVxyXG4qL1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb25TZXJ2aWNlIHtcclxuICByZWFkb25seSBzZXJ2ZXJJZDogc3RyaW5nO1xyXG5cclxuICBwcml2YXRlIF9jb25uQ291bnQ6IG51bWJlcjtcclxuICBnZXQgY29ubkNvdW50KCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5Db3VudDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2xvZ2luZWRDb3VudDogbnVtYmVyO1xyXG4gIGdldCBsb2dpbmVkQ291bnQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fbG9naW5lZENvdW50O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfbG9naW5lZDogeyBbaWR4OiBzdHJpbmddOiBhbnkgfTtcclxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcGxpY2F0aW9uKSB7XHJcbiAgICB0aGlzLnNlcnZlcklkID0gYXBwLnNlcnZlcklkO1xyXG4gICAgdGhpcy5fY29ubkNvdW50ID0gMDtcclxuICAgIHRoaXMuX2xvZ2luZWRDb3VudCA9IDA7XHJcbiAgICB0aGlzLl9sb2dpbmVkID0ge307XHJcbiAgfVxyXG5cclxuICBhZGRMb2dpbmVkVXNlcih1aWQ6IHN0cmluZywgaW5mbzogYW55KSB7XHJcbiAgICBpZiAoIXRoaXMuX2xvZ2luZWRbdWlkXSkge1xyXG4gICAgICB0aGlzLl9sb2dpbmVkQ291bnQrKztcclxuICAgIH1cclxuICAgIGluZm8udWlkID0gdWlkO1xyXG4gICAgdGhpcy5fbG9naW5lZFt1aWRdID0gaW5mbztcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVzZXJJbmZvKHVpZDogc3RyaW5nLCBpbmZvOiBhbnkpIHtcclxuICAgIGxldCB1c2VyID0gdGhpcy5fbG9naW5lZFt1aWRdO1xyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBwIGluIGluZm8pIHtcclxuICAgICAgaWYgKGluZm8uaGFzT3duUHJvcGVydHkocCkgJiYgdHlwZW9mIGluZm9bcF0gIT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIHVzZXJbcF0gPSBpbmZvW3BdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpbmNyZWFzZUNvbm5lY3Rpb25Db3VudCgpIHtcclxuICAgIHRoaXMuX2Nvbm5Db3VudCsrO1xyXG4gIH1cclxuICByZW1vdmVMb2dpbmVkVXNlcih1aWQ6IHN0cmluZykge1xyXG4gICAgaWYgKCEhdGhpcy5fbG9naW5lZFt1aWRdKSB7XHJcbiAgICAgIHRoaXMuX2xvZ2luZWRDb3VudC0tO1xyXG4gICAgfVxyXG4gICAgZGVsZXRlIHRoaXMuX2xvZ2luZWRbdWlkXTtcclxuICB9XHJcblxyXG4gIGRlY3JlYXNlQ29ubmVjdGlvbkNvdW50KHVpZDogc3RyaW5nKSB7XHJcbiAgICBpZiAodGhpcy5fY29ubkNvdW50KSB7XHJcbiAgICAgIHRoaXMuX2Nvbm5Db3VudC0tO1xyXG4gICAgfVxyXG4gICAgaWYgKCEhdWlkKSB7XHJcbiAgICAgIHRoaXMucmVtb3ZlTG9naW5lZFVzZXIodWlkKTtcclxuICAgIH1cclxuICB9XHJcbiAgZ2V0U3RhdGlzdGljc0luZm8oKSB7XHJcbiAgICBsZXQgbGlzdCA9IFtdO1xyXG4gICAgZm9yIChsZXQgdWlkIGluIHRoaXMuX2xvZ2luZWQpIHtcclxuICAgICAgbGlzdC5wdXNoKHRoaXMuX2xvZ2luZWRbdWlkXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmVySWQ6IHRoaXMuc2VydmVySWQsXHJcbiAgICAgIHRvdGFsQ29ubkNvdW50OiB0aGlzLmNvbm5Db3VudCxcclxuICAgICAgbG9naW5lZENvdW50OiB0aGlzLmxvZ2luZWRDb3VudCxcclxuICAgICAgbG9naW5lZExpc3Q6IGxpc3RcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ29ubmVjdGlvbkNvbXBvbmVudCBpbXBsZW1lbnRzIENvbXBvbmVudCB7XHJcblx0cmVhZG9ubHkgbmFtZTogc3RyaW5nO1xyXG5cdHJlYWRvbmx5IHNlcnZpY2U6IENvbm5lY3Rpb25TZXJ2aWNlO1xyXG5cdGNvbnN0cnVjdG9yKHJlYWRvbmx5IGFwcDogQXBwbGljYXRpb24pIHtcclxuXHRcdHRoaXMuc2VydmljZSA9IG5ldyBDb25uZWN0aW9uU2VydmljZShhcHApO1xyXG5cdFx0dGhpcy5uYW1lID0gXCJfX2Nvbm5lY3Rpb25fX1wiO1xyXG5cdH1cclxuXHRhZGRMb2dpbmVkVXNlcih1aWQ6IHN0cmluZywgaW5mbzogYW55KSB7XHJcblx0XHR0aGlzLnNlcnZpY2UuYWRkTG9naW5lZFVzZXIodWlkLCBpbmZvKTtcclxuXHR9XHJcblx0dXBkYXRlVXNlckluZm8odWlkOiBzdHJpbmcsIGluZm86IGFueSkge1xyXG5cdFx0dGhpcy5zZXJ2aWNlLnVwZGF0ZVVzZXJJbmZvKHVpZCwgaW5mbyk7XHJcblx0fVxyXG5cdGluY3JlYXNlQ29ubmVjdGlvbkNvdW50KCkge1xyXG5cdFx0dGhpcy5zZXJ2aWNlLmluY3JlYXNlQ29ubmVjdGlvbkNvdW50KCk7XHJcblx0fVxyXG5cdHJlbW92ZUxvZ2luZWRVc2VyKHVpZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnNlcnZpY2UucmVtb3ZlTG9naW5lZFVzZXIodWlkKTtcclxuXHR9XHJcblx0ZGVjcmVhc2VDb25uZWN0aW9uQ291bnQodWlkOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuc2VydmljZS5kZWNyZWFzZUNvbm5lY3Rpb25Db3VudCh1aWQpO1xyXG5cdH1cclxuXHRnZXRTdGF0aXN0aWNzSW5mbygpIHtcclxuXHRcdHJldHVybiB0aGlzLnNlcnZpY2UuZ2V0U3RhdGlzdGljc0luZm8oKTtcclxuXHR9XHJcbn0iXX0=