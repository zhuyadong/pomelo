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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb25uZWN0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBOzs7Ozs7Ozs7Ozs7OztFQWNFO0FBRUY7SUFJRSxJQUFJLFNBQVM7UUFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBR0QsSUFBSSxZQUFZO1FBQ2QsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDNUIsQ0FBQztJQUdELFlBQVksR0FBZ0I7UUFDMUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7SUFDNUIsQ0FBQztJQUVELGNBQWMsQ0FBQyxHQUFXLEVBQUUsSUFBUztRQUNuQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNWLE1BQU0sQ0FBQztRQUNULENBQUM7UUFFRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ25CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCx1QkFBdUI7UUFDckIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxHQUFXO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsdUJBQXVCLENBQUMsR0FBVztRQUNqQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLENBQUM7SUFDSCxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2YsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELE1BQU0sQ0FBQztZQUNMLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDOUIsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFdBQVcsRUFBRSxJQUFJO1NBQ2xCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF6RUQsOENBeUVDO0FBRUQ7SUFHQyxZQUFxQixHQUFnQjtRQUFoQixRQUFHLEdBQUgsR0FBRyxDQUFhO1FBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDO0lBQzlCLENBQUM7SUFDRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCxjQUFjLENBQUMsR0FBVyxFQUFFLElBQVM7UUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCx1QkFBdUI7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxHQUFXO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUNELHVCQUF1QixDQUFDLEdBQVc7UUFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQ0QsaUJBQWlCO1FBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDekMsQ0FBQztDQUNEO0FBekJELGtEQXlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIi4uLy4uL2FwcGxpY2F0aW9uXCI7XG5pbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcblxuLypcbmV4cG9ydCBpbnRlcmZhY2UgSUNvbm5lY3Rpb25TZXJ2aWNlIHtcbiAgYWRkTG9naW5lZFVzZXIodWlkOiBzdHJpbmcsIGluZm86IGFueSk6dm9pZDtcbiAgdXBkYXRlVXNlckluZm8odWlkOiBzdHJpbmcsIGluZm86IGFueSk6dm9pZDtcbiAgaW5jcmVhc2VDb25uZWN0aW9uQ291bnQoKTp2b2lkO1xuICByZW1vdmVMb2dpbmVkVXNlcih1aWQ6IHN0cmluZyk6dm9pZDtcbiAgZGVjcmVhc2VDb25uZWN0aW9uQ291bnQodWlkOiBzdHJpbmcpOnZvaWQ7XG4gIGdldFN0YXRpc3RpY3NJbmZvKCk6e1xuICAgICAgc2VydmVySWQ6IHN0cmluZztcbiAgICAgIHRvdGFsQ29ubkNvdW50OiBudW1iZXI7XG4gICAgICBsb2dpbmVkQ291bnQ6IG51bWJlcjtcbiAgICAgIGxvZ2luZWRMaXN0OiBhbnlbXTtcbiAgfTtcbn1cbiovXG5cbmV4cG9ydCBjbGFzcyBDb25uZWN0aW9uU2VydmljZSB7XG4gIHJlYWRvbmx5IHNlcnZlcklkOiBzdHJpbmc7XG5cbiAgcHJpdmF0ZSBfY29ubkNvdW50OiBudW1iZXI7XG4gIGdldCBjb25uQ291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5Db3VudDtcbiAgfVxuXG4gIHByaXZhdGUgX2xvZ2luZWRDb3VudDogbnVtYmVyO1xuICBnZXQgbG9naW5lZENvdW50KCkge1xuICAgIHJldHVybiB0aGlzLl9sb2dpbmVkQ291bnQ7XG4gIH1cblxuICBwcml2YXRlIF9sb2dpbmVkOiB7IFtpZHg6IHN0cmluZ106IGFueSB9O1xuICBjb25zdHJ1Y3RvcihhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgdGhpcy5zZXJ2ZXJJZCA9IGFwcC5zZXJ2ZXJJZDtcbiAgICB0aGlzLl9jb25uQ291bnQgPSAwO1xuICAgIHRoaXMuX2xvZ2luZWRDb3VudCA9IDA7XG4gICAgdGhpcy5fbG9naW5lZCA9IHt9O1xuICB9XG5cbiAgYWRkTG9naW5lZFVzZXIodWlkOiBzdHJpbmcsIGluZm86IGFueSkge1xuICAgIGlmICghdGhpcy5fbG9naW5lZFt1aWRdKSB7XG4gICAgICB0aGlzLl9sb2dpbmVkQ291bnQrKztcbiAgICB9XG4gICAgaW5mby51aWQgPSB1aWQ7XG4gICAgdGhpcy5fbG9naW5lZFt1aWRdID0gaW5mbztcbiAgfVxuXG4gIHVwZGF0ZVVzZXJJbmZvKHVpZDogc3RyaW5nLCBpbmZvOiBhbnkpIHtcbiAgICBsZXQgdXNlciA9IHRoaXMuX2xvZ2luZWRbdWlkXTtcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBwIGluIGluZm8pIHtcbiAgICAgIGlmIChpbmZvLmhhc093blByb3BlcnR5KHApICYmIHR5cGVvZiBpbmZvW3BdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdXNlcltwXSA9IGluZm9bcF07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaW5jcmVhc2VDb25uZWN0aW9uQ291bnQoKSB7XG4gICAgdGhpcy5fY29ubkNvdW50Kys7XG4gIH1cbiAgcmVtb3ZlTG9naW5lZFVzZXIodWlkOiBzdHJpbmcpIHtcbiAgICBpZiAoISF0aGlzLl9sb2dpbmVkW3VpZF0pIHtcbiAgICAgIHRoaXMuX2xvZ2luZWRDb3VudC0tO1xuICAgIH1cbiAgICBkZWxldGUgdGhpcy5fbG9naW5lZFt1aWRdO1xuICB9XG5cbiAgZGVjcmVhc2VDb25uZWN0aW9uQ291bnQodWlkOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5fY29ubkNvdW50KSB7XG4gICAgICB0aGlzLl9jb25uQ291bnQtLTtcbiAgICB9XG4gICAgaWYgKCEhdWlkKSB7XG4gICAgICB0aGlzLnJlbW92ZUxvZ2luZWRVc2VyKHVpZCk7XG4gICAgfVxuICB9XG4gIGdldFN0YXRpc3RpY3NJbmZvKCkge1xuICAgIGxldCBsaXN0ID0gW107XG4gICAgZm9yIChsZXQgdWlkIGluIHRoaXMuX2xvZ2luZWQpIHtcbiAgICAgIGxpc3QucHVzaCh0aGlzLl9sb2dpbmVkW3VpZF0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzZXJ2ZXJJZDogdGhpcy5zZXJ2ZXJJZCxcbiAgICAgIHRvdGFsQ29ubkNvdW50OiB0aGlzLmNvbm5Db3VudCxcbiAgICAgIGxvZ2luZWRDb3VudDogdGhpcy5sb2dpbmVkQ291bnQsXG4gICAgICBsb2dpbmVkTGlzdDogbGlzdFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENvbm5lY3Rpb25Db21wb25lbnQgaW1wbGVtZW50cyBDb21wb25lbnQge1xuXHRyZWFkb25seSBuYW1lOiBzdHJpbmc7XG5cdHJlYWRvbmx5IHNlcnZpY2U6IENvbm5lY3Rpb25TZXJ2aWNlO1xuXHRjb25zdHJ1Y3RvcihyZWFkb25seSBhcHA6IEFwcGxpY2F0aW9uKSB7XG5cdFx0dGhpcy5zZXJ2aWNlID0gbmV3IENvbm5lY3Rpb25TZXJ2aWNlKGFwcCk7XG5cdFx0dGhpcy5uYW1lID0gXCJfX2Nvbm5lY3Rpb25fX1wiO1xuXHR9XG5cdGFkZExvZ2luZWRVc2VyKHVpZDogc3RyaW5nLCBpbmZvOiBhbnkpIHtcblx0XHR0aGlzLnNlcnZpY2UuYWRkTG9naW5lZFVzZXIodWlkLCBpbmZvKTtcblx0fVxuXHR1cGRhdGVVc2VySW5mbyh1aWQ6IHN0cmluZywgaW5mbzogYW55KSB7XG5cdFx0dGhpcy5zZXJ2aWNlLnVwZGF0ZVVzZXJJbmZvKHVpZCwgaW5mbyk7XG5cdH1cblx0aW5jcmVhc2VDb25uZWN0aW9uQ291bnQoKSB7XG5cdFx0dGhpcy5zZXJ2aWNlLmluY3JlYXNlQ29ubmVjdGlvbkNvdW50KCk7XG5cdH1cblx0cmVtb3ZlTG9naW5lZFVzZXIodWlkOiBzdHJpbmcpIHtcblx0XHR0aGlzLnNlcnZpY2UucmVtb3ZlTG9naW5lZFVzZXIodWlkKTtcblx0fVxuXHRkZWNyZWFzZUNvbm5lY3Rpb25Db3VudCh1aWQ6IHN0cmluZykge1xuXHRcdHRoaXMuc2VydmljZS5kZWNyZWFzZUNvbm5lY3Rpb25Db3VudCh1aWQpO1xuXHR9XG5cdGdldFN0YXRpc3RpY3NJbmZvKCkge1xuXHRcdHJldHVybiB0aGlzLnNlcnZpY2UuZ2V0U3RhdGlzdGljc0luZm8oKTtcblx0fVxufSJdfQ==