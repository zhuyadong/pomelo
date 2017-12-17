import { constants } from "os";
import { Component } from "../..";
import { Application } from "../../application";
import { ChannelRemote } from "../remote/frontend/channelRemote";
import { Session } from "inspector";
import { invokeCallback, size } from "../../util/utils";
import { createCountDownLatch } from "../../util/countDownLatch";

const logger = require("pomelo-logger").getLogger("pomelo", __filename);

enum State {
  ST_INITED = 0,
  ST_DESTROYED = 1
}

export type BroadcastFilter = (
  session: Session,
  msg: any,
  opts: { filterParam: any }
) => boolean;

export interface ChannelServiceOpts {
  prefix: string;
  store: ChannelStore;
  broadcastFilter: BroadcastFilter;
}

export interface ChannelStore {
  add(key: string, value: any, cb?: Function): void;
  remove(key: string, value: any, cb?: Function): void;
  load(key: string, cb?: Function): void;
  removeAll(key: string, cb?: Function): void;
}

export type ChannelMap = { [idx: string]: Channel };

export class ChannelService implements Component {
  readonly name: string;
  readonly prefix: string;
  readonly store: ChannelStore;
  readonly channelRemote: ChannelRemote;
  readonly broadcastFilter: BroadcastFilter;
  private _channels: ChannelMap;
  get channels() {
    return this._channels;
  }
  constructor(public readonly app: Application, opts: ChannelServiceOpts) {
    opts = opts || {};
    this._channels = {};
    this.name = '__channel__';
    this.prefix = opts.prefix;
    this.store = opts.store;
    this.broadcastFilter = opts.broadcastFilter;
    this.channelRemote = new ChannelRemote(app);
  }

  start(cb?: Function) {
    restoreChannel(this, cb);
  }

  createChannel(name: string) {
    if (this._channels[name]) {
      return this._channels[name];
    }

    let c = new Channel(name, this);
    addToStore(this, genKey(this), genKey(this, name));
    this._channels[name] = c;
    return c;
  }

  getChannel(name: string, create?: boolean) {
    let channel = this.channels[name];
    if (!channel && !!create) {
      channel = this.channels[name] = new Channel(name, this);
      addToStore(this, genKey(this), genKey(this, name));
    }
    return channel;
  }

  destroyChannel(name: string) {
    delete this.channels[name];
    removeFromStore(this, genKey(this), genKey(this, name));
    removeAllFromStore(this, genKey(this, name));
  }

  pushMessageByUids(
    route: string,
    msg: any,
    uids: ChannelMember[],
    opts?: any,
    cb?: Function
  ) {
    if (typeof route !== "string") {
      cb = opts;
      opts = uids;
      uids = msg;
      msg = route;
      route = msg.route;
    }

    if (!cb && typeof opts === "function") {
      cb = opts;
      opts = {};
    }

    if (!uids || uids.length === 0) {
      invokeCallback(cb!, new Error("uids should not be empty"));
      return;
    }
    let groups = {},
      record;
    for (let i = 0, l = uids.length; i < l; i++) {
      record = uids[i];
      add(record.uid, record.sid, groups);
    }

    sendMessageByGroup(this, route, msg, groups, opts, cb);
  }

  broadcast(stype: string, route: string, msg: any, opts?: any, cb?: Function) {
    let app = this.app;
    let namespace = "sys";
    let service = "channelRemote";
    let method = "broadcast";
    let servers = app.getServersByType(stype);

    if (!servers || servers.length === 0) {
      // server list is empty
      invokeCallback(cb!);
      return;
    }

    let count = servers.length;
    let successFlag = false;

    let latch = createCountDownLatch(count, null, () => {
      if (!successFlag) {
        invokeCallback(cb!, new Error("broadcast fails"));
        return;
      }
      invokeCallback(cb!, null);
    });

    let genCB = (serverId?: string) => {
      return (err: any) => {
        if (err) {
          logger.error(
            "[broadcast] fail to push message to serverId: " +
              serverId +
              ", err:" +
              err.stack
          );
          latch.done();
          return;
        }
        successFlag = true;
        latch.done();
      };
    };

    let self = this;
    let sendMessage = (serverId: string) => {
      return (() => {
        if (serverId === app.serverId) {
          (<any>self).channelRemote[method](route, msg, opts, genCB());
        } else {
          app.rpcInvoke(
            serverId,
            {
              namespace: namespace,
              service: service,
              method: method,
              args: [route, msg, opts]
            },
            genCB(serverId)
          );
        }
      })();
    };

    opts = { type: "broadcast", userOptions: opts || {} };

    // for compatiblity
    opts.isBroadcast = true;
    if (opts.userOptions) {
      opts.binded = opts.userOptions.binded;
      opts.filterParam = opts.userOptions.filterParam;
    }

    for (let i = 0, l = count; i < l; i++) {
      sendMessage(servers[i].id);
    }
  }
}

export type ChannelGroupMap = { [id: string]: string[] };
export interface ChannelMember {
  sid: string;
  uid: string;
}
export type ChannelMemberMap = { [id: string]: ChannelMember };

export class Channel {
  private _state: State;

  private _userAmount: number;
  get userAmount() {
    return this._userAmount;
  }

  private _groups: ChannelGroupMap;
  get groups(): Readonly<ChannelGroupMap> {
    return this._groups;
  }

  private _records: ChannelMemberMap;
  get records(): Readonly<ChannelMemberMap> {
    return this._records;
  }

  get channelService() {
    return this._channelService;
  }

  constructor(
    public readonly name: string,
    private _channelService: ChannelService
  ) {
    this._groups = {};
    this._records = {};
    this._state = State.ST_INITED;
    this._userAmount = 0;
  }

  add(uid: string, sid: string) {
    if (this._state > State.ST_INITED) {
      return false;
    } else {
      let res = add(uid, sid, this._groups);
      if (res) {
        this._records[uid] = { sid: sid, uid: uid };
        ++this._userAmount;
      }
      addToStore(
        this._channelService,
        genKey(this._channelService, this.name),
        genValue(sid, uid)
      );
      return res;
    }
  }

  leave(uid: string, sid: string) {
    if (!uid || !sid) {
      return false;
    }
    let res = deleteFrom(uid, sid, this.groups[sid]);
    if (res) {
      delete this._records[uid];
      --this._userAmount;
    }
    if (this.userAmount < 0) this._userAmount = 0; //robust
    removeFromStore(
      this._channelService,
      genKey(this._channelService, this.name),
      genValue(sid, uid)
    );
    if (this.groups[sid] && this.groups[sid].length === 0) {
      delete this._groups[sid];
    }
    return res;
  }

  getMembers() {
    let res = [],
      groups = this.groups;
    let group, i, l;
    for (let sid in groups) {
      group = groups[sid];
      for (i = 0, l = group.length; i < l; i++) {
        res.push(group[i]);
      }
    }
    return res;
  }

  getMember(uid: string) {
    return this._records[uid];
  }

  destroy() {
    this._state = State.ST_DESTROYED;
    this._channelService.destroyChannel(this.name);
  }

  pushMessage(route:string, msg:any, opts?:any, cb?:Function) {
  if(this._state !== State.ST_INITED) {
    invokeCallback(cb!, new Error('channel is not running now'));
    return;
  }

  if(typeof route !== 'string') {
    cb = opts;
    opts = msg;
    msg = route;
    route = msg.route;
  }

  if(!cb && typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  sendMessageByGroup(this._channelService, route, msg, this.groups, opts, cb);
  }
}

function add(uid: string, sid: string, groups: ChannelGroupMap) {
  if (!sid) {
    logger.warn("ignore uid %j for sid not specified.", uid);
    return false;
  }

  let group = groups[sid];
  if (!group) {
    group = [];
    groups[sid] = group;
  }

  group.push(uid);
  return true;
}

function deleteFrom(uid: string, sid: string, group: string[]) {
  if (!uid || !sid || !group) {
    return false;
  }

  for (let i = 0, l = group.length; i < l; i++) {
    if (group[i] === uid) {
      group.splice(i, 1);
      return true;
    }
  }

  return false;
}

function sendMessageByGroup(
  channelService: ChannelService,
  route: string,
  msg: any,
  groups: ChannelGroupMap,
  opts: any,
  cb?: Function
) {
  let app = channelService.app;
  let namespace = "sys";
  let service = "channelRemote";
  let method = "pushMessage";
  let count = size(groups);
  let successFlag = false;
  let failIds: string[] = [];

  logger.debug(
    "[%s] channelService sendMessageByGroup route: %s, msg: %j, groups: %j, opts: %j",
    app.serverId,
    route,
    msg,
    groups,
    opts
  );
  if (count === 0) {
    // group is empty
    invokeCallback(cb!);
    return;
  }

  let latch = createCountDownLatch(count, {}, () => {
    if (!successFlag) {
      invokeCallback(cb!, new Error("all uids push message fail"));
      return;
    }
    invokeCallback(cb!, null, failIds);
  });

  let rpcCB = (serverId: string) => {
    return (err: any, fails: any) => {
      if (err) {
        logger.error(
          "[pushMessage] fail to dispatch msg to serverId: " +
            serverId +
            ", err:" +
            err.stack
        );
        latch.done();
        return;
      }
      if (fails) {
        failIds = failIds.concat(fails);
      }
      successFlag = true;
      latch.done();
    };
  };

  opts = { type: "push", userOptions: opts || {} };
  // for compatiblity
  opts.isPush = true;

  let sendMessage = (sid: string) => {
    return (() => {
      if (sid === app.serverId) {
        (<any>channelService).channelRemote[method](
          route,
          msg,
          groups[sid],
          opts,
          rpcCB(sid)
        );
      } else {
        app.rpcInvoke(
          sid,
          {
            namespace: namespace,
            service: service,
            method: method,
            args: [route, msg, groups[sid], opts]
          },
          rpcCB(sid)
        );
      }
    })();
  };

  let group;
  for (let sid in groups) {
    group = groups[sid];
    if (group && group.length > 0) {
      sendMessage(sid);
    } else {
      // empty group
      process.nextTick(rpcCB(sid));
    }
  }
}

function restoreChannel(self: ChannelService, cb?: Function) {
  if (!self.store) {
    invokeCallback(cb!);
    return;
  } else {
    loadAllFromStore(self, genKey(self), (err: any, list: any) => {
      if (!!err) {
        invokeCallback(cb!, err);
        return;
      } else {
        if (!list.length || !Array.isArray(list)) {
          invokeCallback(cb!);
          return;
        }
        let load = (key: string) => {
          return (() => {
            loadAllFromStore(self, key, (err: any, items: string[]) => {
              for (let j = 0; j < items.length; j++) {
                let array = items[j].split(":");
                let sid = array[0];
                let uid = array[1];
                let channel = self.channels[name];
                let res = add(uid, sid, channel.groups);
                if (res) {
                  (<any>channel).records[uid] = { sid: sid, uid: uid };
                }
              }
            });
          })();
        };

        for (let i = 0; i < list.length; i++) {
          let name = list[i].slice(genKey(self).length + 1);
          self.channels[name] = new Channel(name, self);
          load(list[i]);
        }
        invokeCallback(cb!);
      }
    });
  }
}

function addToStore(self: ChannelService, key: string, value: any) {
  if (!!self.store) {
    self.store.add(key, value, (err: any) => {
      if (!!err) {
        logger.error(
          "add key: %s value: %s to store, with err: %j",
          key,
          value,
          err.stack
        );
      }
    });
  }
}

function removeFromStore(self: ChannelService, key: string, value: any) {
  if (!!self.store) {
    self.store.remove(key, value, (err: any) => {
      if (!!err) {
        logger.error(
          "remove key: %s value: %s from store, with err: %j",
          key,
          value,
          err.stack
        );
      }
    });
  }
}

function loadAllFromStore(self: ChannelService, key: string, cb?: Function) {
  if (!!self.store) {
    self.store.load(key, (err: any, list: any) => {
      if (!!err) {
        logger.error("load key: %s from store, with err: %j", key, err.stack);
        invokeCallback(cb!, err);
      } else {
        invokeCallback(cb!, null, list);
      }
    });
  }
}

function removeAllFromStore(self: ChannelService, key: string) {
  if (!!self.store) {
    self.store.removeAll(key, (err: any) => {
      if (!!err) {
        logger.error(
          "remove key: %s all members from store, with err: %j",
          key,
          err.stack
        );
      }
    });
  }
}

function genKey(self: ChannelService, name?: string) {
  if (!!name) {
    return self.prefix + ":" + self.app.serverId + ":" + name;
  } else {
    return self.prefix + ":" + self.app.serverId;
  }
}

function genValue(sid: string, uid: string) {
  return sid + ":" + uid;
}
