"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("process");
const path = require("path");
const fs = require("fs");
const events_1 = require("events");
const pomelo_1 = require("./pomelo");
const utils_1 = require("./util/utils");
const starter_1 = require("./master/starter");
const appManager = require("./common/manager/appManager");
const index_1 = require("./index");
const async = require("async");
const Logger = require("pomelo-logger");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
var State;
(function (State) {
    State[State["STATE_INITED"] = 1] = "STATE_INITED";
    State[State["STATE_START"] = 2] = "STATE_START";
    State[State["STATE_STARTED"] = 3] = "STATE_STARTED";
    State[State["STATE_STOPED"] = 4] = "STATE_STOPED"; // app has stoped
})(State || (State = {}));
class Application {
    get components() {
        return this._components;
    }
    get serverId() {
        return this.get(index_1.RESERVED.SERVER_ID);
    }
    getServerId() {
        return this.serverId;
    }
    get serverType() {
        return this.get(index_1.RESERVED.SERVER_TYPE);
    }
    get curServer() {
        return this.get(index_1.RESERVED.CURRENT_SERVER);
    }
    get startTime() {
        return this._startTime;
    }
    get servers() {
        return this._servers;
    }
    get serverTypeMaps() {
        return this._serverTypeMaps;
    }
    get serverTypes() {
        return this._serverTypes;
    }
    get lifecycleCbs() {
        return this._lifecycleCbs;
    }
    get clusterSeq() {
        return this._clusterSeq;
    }
    get settings() {
        return this._settings;
    }
    get master() {
        return this.get(index_1.RESERVED.MASTER);
    }
    get base() {
        return this.get(index_1.RESERVED.BASE);
    }
    get env() {
        return this.get(index_1.RESERVED.ENV);
    }
    get main() {
        return this.get(index_1.RESERVED.MAIN);
    }
    get mode() {
        return this.get(index_1.RESERVED.MODE);
    }
    get type() {
        return this.get(index_1.RESERVED.TYPE);
    }
    get startId() {
        return this.get(index_1.RESERVED.STARTID);
    }
    get serversFromConfig() {
        return this.get(index_1.KEYWORDS.SERVER_MAP);
    }
    getServersFromConfig() {
        return this.serversFromConfig;
    }
    get backendSessionService() {
        return this.get("backendSessionService");
    }
    get channelService() {
        return this.get("channelService");
    }
    get rpcInvoke() {
        return this.get("rpcInvoke"); //TODO
    }
    static get instance() {
        if (!Application._instance) {
            Application._instance = new Application();
        }
        return Application._instance;
    }
    constructor() {
        this.event = new events_1.EventEmitter();
        this._loaded = [];
        this._components = {};
        this._settings = {};
        this._servers = {};
        this._serverTypeMaps = {};
        this._serverTypes = [];
        this._lifecycleCbs = {};
        this._clusterSeq = {};
    }
    init(opts) {
        opts = opts || {};
        let base = opts.base || path.dirname(require.main.filename);
        this.set(index_1.RESERVED.BASE, base);
        this.defaultConfiguration();
        this._state = State.STATE_INITED;
        logger.info("application inited: %j", this.serverId);
    }
    require(ph) {
        return require(path.join(this.base, ph));
    }
    configureLogger(logger) {
        if (process.env.POMELO_LOGGER !== "off") {
            let base = this.base;
            let env = this.get(index_1.RESERVED.ENV);
            let originPath = path.join(base, index_1.FILEPATH.LOG);
            let presentPath = path.join(base, index_1.FILEPATH.CONFIG_DIR, env, path.basename(index_1.FILEPATH.LOG));
            if (fs.existsSync(originPath)) {
                logger.configure(originPath, { serverId: this.serverId, base: base });
            }
            else if (fs.existsSync(presentPath)) {
                logger.configure(presentPath, { serverId: this.serverId, base: base });
            }
            else {
                logger.error("logger file path configuration is error.");
            }
        }
    }
    filter(filter) {
        this.before(filter);
        this.after(filter);
    }
    before(bf) {
        addFilter(this, index_1.KEYWORDS.BEFORE_FILTER, bf);
    }
    after(af) {
        addFilter(this, index_1.KEYWORDS.AFTER_FILTER, af);
    }
    globalFilter(filter) {
        this.globalBefore(filter);
        this.globalAfter(filter);
    }
    globalBefore(bf) {
        addFilter(this, index_1.KEYWORDS.GLOBAL_BEFORE_FILTER, bf);
    }
    globalAfter(af) {
        addFilter(this, index_1.KEYWORDS.GLOBAL_AFTER_FILTER, af);
    }
    rpcBefore(bf) {
        addFilter(this, index_1.KEYWORDS.RPC_BEFORE_FILTER, bf);
    }
    rpcAfter(af) {
        addFilter(this, index_1.KEYWORDS.RPC_AFTER_FILTER, af);
    }
    rpcFilter(filter) {
        this.rpcBefore(filter);
        this.rpcAfter(filter);
    }
    load(component, opts) {
        let name = null;
        if (typeof component === "function") {
            component = component(this, opts);
        }
        if (!name && typeof component.name === "string") {
            name = component.name;
        }
        if (name && this.components[name]) {
            // ignore duplicat component
            logger.warn("ignore duplicate component: %j", name);
            return;
        }
        this._loaded.push(component);
        if (name) {
            // components with a name would get by name throught app.components later.
            this._components[name] = component;
        }
        return this;
    }
    loadConfigBaseApp(key, val, reload = false) {
        let env = this.get(index_1.RESERVED.ENV);
        let originPath = path.join(this.base, val);
        let presentPath = path.join(this.base, index_1.FILEPATH.CONFIG_DIR, env, path.basename(val));
        let realPath;
        if (fs.existsSync(originPath)) {
            realPath = originPath;
            let file = require(originPath);
            if (file[env]) {
                file = file[env];
            }
            this.set(key, file);
        }
        else if (fs.existsSync(presentPath)) {
            realPath = presentPath;
            let pfile = require(presentPath);
            this.set(key, pfile);
        }
        else {
            logger.error("invalid configuration with file path: %s", key);
        }
        if (!!realPath && !!reload) {
            fs.watch(realPath, (event, filename) => {
                if (event === "change") {
                    delete require.cache[require.resolve(realPath)];
                    this.loadConfigBaseApp(key, val);
                }
            });
        }
    }
    loadConfig(key, val) {
        let env = this.get(index_1.RESERVED.ENV);
        let mod = require(val);
        if (mod[env]) {
            mod = mod[env];
        }
        this.set(key, mod);
    }
    route(serverType, routeFunc) {
        let routes = this.get(index_1.KEYWORDS.ROUTE);
        if (!routes) {
            routes = {};
            this.set(index_1.KEYWORDS.ROUTE, routes);
        }
        routes[serverType] = routeFunc;
        return this;
    }
    start(cb) {
        this._startTime = Date.now();
        if (this._state > State.STATE_INITED) {
            utils_1.invokeCallback(cb, new Error("application has already start."));
            return;
        }
        this.startByType(() => {
            this.loadDefaultComponents();
            let startUp = () => {
                this.optComponents(this._loaded, index_1.RESERVED.START, (err) => {
                    this._state = State.STATE_START;
                    if (err) {
                        utils_1.invokeCallback(cb, err);
                    }
                    else {
                        logger.info("%j enter after start...", this.serverId);
                        this.afterStart(cb);
                    }
                });
            };
            let beforeFun = this.lifecycleCbs[index_1.LIFECYCLE.BEFORE_STARTUP];
            if (!!beforeFun) {
                beforeFun.call(null, this, startUp);
            }
            else {
                startUp();
            }
        });
    }
    afterStart(cb) {
        if (this._state !== State.STATE_START) {
            utils_1.invokeCallback(cb, new Error("application is not running now."));
            return;
        }
        let afterFun = this.lifecycleCbs[index_1.LIFECYCLE.AFTER_STARTUP];
        this.optComponents(this._loaded, index_1.RESERVED.AFTER_START, (err) => {
            this._state = State.STATE_STARTED;
            let id = this.serverId;
            if (!err) {
                logger.info("%j finish start", id);
            }
            if (!!afterFun) {
                afterFun.call(null, this, function () {
                    utils_1.invokeCallback(cb, err);
                });
            }
            else {
                utils_1.invokeCallback(cb, err);
            }
            let usedTime = Date.now() - this.startTime;
            logger.info("%j startup in %s ms", id, usedTime);
            this.event.emit(pomelo_1.events.START_SERVER, id);
        });
    }
    stop(force) {
        if (this._state > State.STATE_STARTED) {
            logger.warn("[pomelo application] application is not running now.");
            return;
        }
        this._state = State.STATE_STOPED;
        let self = this;
        this._stopTimer = setTimeout(() => {
            process.exit(0);
        }, index_1.TIME.TIME_WAIT_STOP);
        let cancelShutDownTimer = () => {
            if (!!self._stopTimer) {
                clearTimeout(self._stopTimer);
            }
        };
        let shutDown = () => {
            this.stopComps(self._loaded, 0, force, () => {
                cancelShutDownTimer();
                if (force) {
                    process.exit(0);
                }
            });
        };
        let fun = this.get(index_1.KEYWORDS.BEFORE_STOP_HOOK);
        let stopFun = this.lifecycleCbs[index_1.LIFECYCLE.BEFORE_SHUTDOWN];
        if (!!stopFun) {
            stopFun.call(null, this, shutDown, cancelShutDownTimer);
        }
        else if (!!fun) {
            utils_1.invokeCallback(fun, self, shutDown, cancelShutDownTimer);
        }
        else {
            shutDown();
        }
    }
    set(setting, val) {
        this._settings[setting] = val;
        return this;
    }
    /* 如果要给Applicatoin.get加上新的key，可以在需要的地方如下这样merge进入Application:
    import 'path_to/application'
  import { ChannelService } from './common/service/channelService';
  import { SessionComponent } from '../../../gitee/pomelo-ts/pomelo/index';
  import { RESERVED } from './util/constants';
    declare module 'path_to/application' {
      export interface Application {
        get(setting: 'mykey'):SomeType;
      }
    }
    */
    get(setting) {
        return this._settings[setting];
    }
    enabled(setting) {
        return !!this.get(setting);
    }
    disabled(setting) {
        return !this.get(setting);
    }
    enable(setting) {
        return this.set(setting, true);
    }
    disable(setting) {
        return this.set(setting, false);
    }
    configure(env, type, fn) {
        let args = [].slice.call(arguments);
        fn = args.pop();
        env = type = index_1.RESERVED.ALL;
        if (args.length > 0) {
            env = args[0];
        }
        if (args.length > 1) {
            type = args[1];
        }
        if (env === index_1.RESERVED.ALL || contains(this.settings.env, env)) {
            if (type === index_1.RESERVED.ALL || contains(this.settings.serverType, type)) {
                fn.call(this);
            }
        }
        return this;
    }
    registerAdmin(moduleId, module, opts) {
        let modules = this.get(index_1.KEYWORDS.MODULE);
        if (!modules) {
            modules = {};
            this.set(index_1.KEYWORDS.MODULE, modules);
        }
        if (typeof moduleId !== "string") {
            opts = module;
            module = moduleId;
            if (module) {
                moduleId = module.moduleId;
            }
        }
        if (!moduleId) {
            return;
        }
        modules[moduleId] = {
            moduleId: moduleId,
            module: module,
            opts: opts
        };
    }
    use(plugin, opts) {
        if (!plugin.components) {
            logger.error("invalid components, no components exist");
            return;
        }
        opts = opts || {};
        let dir = path.dirname(plugin.components);
        if (!fs.existsSync(plugin.components)) {
            logger.error("fail to find components, find path: %s", plugin.components);
            return;
        }
        fs.readdirSync(plugin.components).forEach(filename => {
            if (!/\.js$/.test(filename)) {
                return;
            }
            let name = path.basename(filename, ".js");
            let param = opts[name] || {};
            let absolutePath = path.join(dir, index_1.DIR.COMPONENT, filename);
            if (!fs.existsSync(absolutePath)) {
                logger.error("component %s not exist at %s", name, absolutePath);
            }
            else {
                this.load(require(absolutePath), param);
            }
        });
        // load events
        if (!plugin.events) {
            return;
        }
        else {
            if (!fs.existsSync(plugin.events)) {
                logger.error("fail to find events, find path: %s", plugin.events);
                return;
            }
            fs.readdirSync(plugin.events).forEach(filename => {
                if (!/\.js$/.test(filename)) {
                    return;
                }
                let absolutePath = path.join(dir, index_1.DIR.EVENT, filename);
                if (!fs.existsSync(absolutePath)) {
                    logger.error("events %s not exist at %s", filename, absolutePath);
                }
                else {
                    bindEvents(require(absolutePath), this);
                }
            });
        }
    }
    transaction(name, conditions, handlers, retry) {
        appManager.transaction(name, conditions, handlers, retry);
    }
    getServerById(serverId) {
        return this._servers[serverId];
    }
    getServerFromConfig(serverId) {
        return this.serversFromConfig[serverId];
    }
    getServersByType(serverType) {
        return this._serverTypeMaps[serverType];
    }
    isFrontend(server) {
        server = server || this.curServer;
        return !!server && server.frontend === "true";
    }
    isBackend(server) {
        server = server || this.curServer;
        return !!server && !server.frontend;
    }
    isMaster() {
        return this.serverType === index_1.RESERVED.MASTER;
    }
    addServers(servers) {
        if (!servers || !servers.length) {
            return;
        }
        for (let i = 0, l = servers.length; i < l; i++) {
            let item = servers[i];
            // update global server map
            this._servers[item.id] = item;
            // update global server type map
            let slist = this._serverTypeMaps[item.serverType];
            if (!slist) {
                this._serverTypeMaps[item.serverType] = slist = [];
            }
            replaceServer(slist, item);
            // update global server type list
            if (this.serverTypes.indexOf(item.serverType) < 0) {
                this.serverTypes.push(item.serverType);
            }
        }
        this.event.emit(pomelo_1.events.ADD_SERVERS, servers);
    }
    removeServers(ids) {
        if (!ids || !ids.length) {
            return;
        }
        for (let i = 0, l = ids.length; i < l; i++) {
            let id = ids[i];
            let item = this.servers[id];
            if (!item) {
                continue;
            }
            // clean global server map
            delete this._servers[id];
            // clean global server type map
            let slist = this._serverTypeMaps[item.serverType];
            removeServer(slist, id);
            // TODO: should remove the server type if the slist is empty?
        }
        this.event.emit(pomelo_1.events.REMOVE_SERVERS, ids);
    }
    replaceServers(servers) {
        if (!servers) {
            return;
        }
        this._servers = servers;
        this._serverTypeMaps = {};
        this._serverTypes = [];
        let serverArray = [];
        for (let id in servers) {
            let server = servers[id];
            let serverType = server[index_1.RESERVED.SERVER_TYPE];
            let slist = this._serverTypeMaps[serverType];
            if (!slist) {
                this._serverTypeMaps[serverType] = slist = [];
            }
            this._serverTypeMaps[serverType].push(server);
            // update global server type list
            if (this._serverTypes.indexOf(serverType) < 0) {
                this._serverTypes.push(serverType);
            }
            serverArray.push(server);
        }
        this.event.emit(pomelo_1.events.REPLACE_SERVERS, serverArray);
    }
    addCrons(crons) {
        if (!crons || !crons.length) {
            logger.warn("crons is not defined.");
            return;
        }
        this.event.emit(pomelo_1.events.ADD_CRONS, crons);
    }
    removeCrons(crons) {
        if (!crons || !crons.length) {
            logger.warn("ids is not defined.");
            return;
        }
        this.event.emit(pomelo_1.events.REMOVE_CRONS, crons);
    }
    loadServers() {
        this.loadConfigBaseApp(index_1.RESERVED.SERVERS, index_1.FILEPATH.SERVER);
        const servers = this.get(index_1.RESERVED.SERVERS);
        let serverMap = {};
        for (let serverType in servers) {
            let slist = servers[serverType];
            for (let server of slist) {
                server.serverType = serverType;
                if (server[index_1.RESERVED.CLUSTER_COUNT]) {
                    this.loadCluster(server, serverMap);
                    continue;
                }
                serverMap[server.id] = server;
            }
        }
        this.set(index_1.KEYWORDS.SERVER_MAP, serverMap);
    }
    processArgs(args) {
        let serverType = args.serverType || index_1.RESERVED.MASTER;
        let serverId = args.id || this.master.id;
        let mode = args.mode || index_1.RESERVED.CLUSTER;
        let masterha = args.masterha || "false";
        let type = args.type || index_1.RESERVED.ALL;
        let startId = args.startId;
        this.set(index_1.RESERVED.MAIN, args.main);
        this.set(index_1.RESERVED.SERVER_TYPE, serverType);
        this.set(index_1.RESERVED.SERVER_ID, serverId);
        this.set(index_1.RESERVED.MODE, mode);
        this.set(index_1.RESERVED.TYPE, type);
        if (!!startId) {
            this.set(index_1.RESERVED.STARTID, startId);
        }
        if (masterha === "true") {
            this.set(index_1.RESERVED.MASTER, args);
            this.set(index_1.RESERVED.CURRENT_SERVER, args);
        }
        else if (serverType !== index_1.RESERVED.MASTER) {
            this.set(index_1.RESERVED.CURRENT_SERVER, args);
        }
        else {
            this.set(index_1.RESERVED.CURRENT_SERVER, this.master);
        }
    }
    configLogger() {
        if (process.env.POMELO_LOGGER !== "off") {
            let env = this.get(index_1.RESERVED.ENV);
            let originPath = path.join(this.base, index_1.FILEPATH.LOG);
            let presentPath = path.join(this.base, index_1.FILEPATH.CONFIG_DIR, env, path.basename(index_1.FILEPATH.LOG));
            if (fs.existsSync(originPath)) {
                this.logConfigure(originPath);
            }
            else if (fs.existsSync(presentPath)) {
                this.logConfigure(presentPath);
            }
            else {
                logger.error("logger file path configuration is error.");
            }
        }
    }
    loadLifecycle() {
        let filePath = path.join(this.base, index_1.FILEPATH.SERVER_DIR, this.serverType, index_1.FILEPATH.LIFECYCLE);
        if (!fs.existsSync(filePath)) {
            return;
        }
        let lifecycle = require(filePath);
        for (let key in lifecycle) {
            if (typeof lifecycle[key] === "function") {
                this._lifecycleCbs[key] = lifecycle[key];
            }
            else {
                logger.warn("lifecycle.js in %s is error format.", filePath);
            }
        }
    }
    logConfigure(filename) {
        Logger.configure(filename, { serverId: this.serverId, base: this.base });
    }
    defaultConfiguration() {
        const args = parseArgs(process.argv);
        this.set(index_1.RESERVED.ENV, args.env || process.env.NODE_ENV || index_1.RESERVED.ENV_DEV);
        this.loadConfigBaseApp(index_1.RESERVED.MASTER, index_1.FILEPATH.MASTER);
        this.loadServers();
        this.processArgs(args);
        this.configLogger();
        this.loadLifecycle();
    }
    loadCluster(server, serverMap) {
        let increaseFields = {};
        let host = server.host;
        let count = parseInt(server[index_1.RESERVED.CLUSTER_COUNT]);
        let seq = this.clusterSeq[server.serverType];
        if (!seq) {
            seq = 0;
            this._clusterSeq[server.serverType] = count;
        }
        else {
            this._clusterSeq[server.serverType] = seq + count;
        }
        for (let key in server) {
            let value = server[key].toString();
            if (value.indexOf(index_1.RESERVED.CLUSTER_SIGNAL) > 0) {
                let base = server[key].slice(0, -2);
                increaseFields[key] = base;
            }
        }
        let clone = (src) => {
            let rs = {};
            for (let key in src) {
                rs[key] = src[key];
            }
            return rs;
        };
        for (let i = 0, l = seq; i < count; i++, l++) {
            let cserver = clone(server);
            cserver.id = index_1.RESERVED.CLUSTER_PREFIX + server.serverType + "-" + l;
            for (let k in increaseFields) {
                let v = parseInt(increaseFields[k]);
                cserver[k] = v + i;
            }
            serverMap[cserver.id] = cserver;
        }
    }
    startByType(cb) {
        if (!!this.startId) {
            if (this.startId === index_1.RESERVED.MASTER) {
                utils_1.invokeCallback(cb);
            }
            else {
                starter_1.runServers(this);
            }
        }
        else {
            if (!!this.type &&
                this.type !== index_1.RESERVED.ALL &&
                this.type !== index_1.RESERVED.MASTER) {
                starter_1.runServers(this);
            }
            else {
                utils_1.invokeCallback(cb);
            }
        }
    }
    loadDefaultComponents() {
        let pomelo = require("./pomelo").default;
        // load system default components
        if (this.serverType === index_1.RESERVED.MASTER) {
            this.load(pomelo.master, this.get("masterConfig"));
        }
        else {
            this.load(pomelo.proxy, this.get("proxyConfig"));
            if (this.curServer.port) {
                this.load(pomelo.remote, this.get("remoteConfig"));
            }
            if (this.isFrontend()) {
                this.load(pomelo.connection, this.get("connectionConfig"));
                this.load(pomelo.connector, this.get("connectorConfig"));
                this.load(pomelo.session, this.get("sessionConfig"));
                // compatible for schedulerConfig
                if (this.get("schedulerConfig")) {
                    this.load(pomelo.pushScheduler, this.get("schedulerConfig"));
                }
                else {
                    this.load(pomelo.pushScheduler, this.get("pushSchedulerConfig"));
                }
            }
            this.load(pomelo.backendSession, this.get("backendSessionConfig"));
            this.load(pomelo.channel, this.get("channelConfig"));
            this.load(pomelo.server, this.get("serverConfig"));
        }
        this.load(pomelo.monitor, this.get("monitorConfig"));
    }
    stopComps(comps, index, force, cb) {
        if (index >= comps.length) {
            utils_1.invokeCallback(cb);
            return;
        }
        let comp = comps[index];
        if (typeof comp.stop === "function") {
            comp.stop(force, () => {
                // ignore any error
                this.stopComps(comps, index + 1, force, cb);
            });
        }
        else {
            this.stopComps(comps, index + 1, force, cb);
        }
    }
    optComponents(comps, method, cb) {
        /*
        async function callCompMethod(comp: any) {
          return new Promise((c, e) => {
            comp[method](c);
          });
        }
        for (let comp of comps) {
          if (typeof comp[method] === "function") {
            let err: any = await callCompMethod(comp);
            if (err) {
              if (typeof err === "string") {
                logger.error(
                  "fail to operate component, method: %s, err: %j",
                  method,
                  err
                );
              } else {
                logger.error(
                  "fail to operate component, method: %s, err: %j",
                  method,
                  err.stack
                );
              }
              invokeCallback(cb!, err);
              return;
            }
          }
        }
        invokeCallback(cb!);
        */
        let i = 0;
        async.forEachSeries(comps, (comp, done) => {
            i++;
            if (typeof comp[method] === "function") {
                comp[method](done);
            }
            else {
                done();
            }
        }, (err) => {
            if (err) {
                if (typeof err === "string") {
                    logger.error("fail to operate component, method: %s, err: %j", method, err);
                }
                else {
                    logger.error("fail to operate component, method: %s, err: %j", method, err.stack);
                }
            }
            utils_1.invokeCallback(cb, err);
        });
    }
}
exports.default = Application;
exports.Application = Application;
function parseArgs(args) {
    let argsMap = {};
    let mainPos = 1;
    while (args[mainPos].indexOf("--") > 0) {
        mainPos++;
    }
    argsMap.main = args[mainPos];
    for (let i = mainPos + 1; i < args.length; i++) {
        let arg = args[i];
        let sep = arg.indexOf("=");
        let key = arg.slice(0, sep);
        let value = arg.slice(sep + 1);
        if (!isNaN(Number(value)) && value.indexOf(".") < 0) {
            value = Number(value);
        }
        argsMap[key] = value;
    }
    return argsMap;
}
function replaceServer(slist, serverInfo) {
    for (let i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === serverInfo.id) {
            slist[i] = serverInfo;
            return;
        }
    }
    slist.push(serverInfo);
}
function removeServer(slist, id) {
    if (!slist || !slist.length) {
        return;
    }
    for (let i = 0, l = slist.length; i < l; i++) {
        if (slist[i].id === id) {
            slist.splice(i, 1);
            return;
        }
    }
}
function contains(str, settings) {
    if (!settings) {
        return false;
    }
    let ts = settings.split("|");
    for (let i = 0, l = ts.length; i < l; i++) {
        if (str === ts[i]) {
            return true;
        }
    }
    return false;
}
function bindEvents(Event, app) {
    let emethods = new Event(app);
    for (let m in emethods) {
        if (typeof emethods[m] === "function") {
            app.event.on(m, emethods[m].bind(emethods));
        }
    }
}
function addFilter(app, type, filter) {
    let filters = app.get(type);
    if (!filters) {
        filters = [];
        app.set(type, filters);
    }
    filters.push(filter);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbGljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcHBsaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFvQztBQUNwQyw2QkFBOEI7QUFDOUIseUJBQTBCO0FBQzFCLG1DQUFzQztBQUV0QyxxQ0FBa0M7QUFDbEMsd0NBQThDO0FBQzlDLDhDQUE4QztBQUc5QywwREFBMkQ7QUFDM0QsbUNBcUJpQjtBQUVqQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBRXhFLElBQUssS0FLSjtBQUxELFdBQUssS0FBSztJQUNSLGlEQUFnQixDQUFBO0lBQ2hCLCtDQUFlLENBQUE7SUFDZixtREFBaUIsQ0FBQTtJQUNqQixpREFBZ0IsQ0FBQSxDQUFDLGlCQUFpQjtBQUNwQyxDQUFDLEVBTEksS0FBSyxLQUFMLEtBQUssUUFLVDtBQWtJRDtJQU1FLElBQUksVUFBVTtRQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxXQUFXO1FBQ1QsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELElBQUksU0FBUztRQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFRLENB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RUFBRSxDQUFDLENBQUMsRUFBUSxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsbUJBQW1CLEdBQWdCLEVBQUUsSUFBWSxFQUFFLE1BQTBCO0lBQzNFLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJvY2VzcyA9IHJlcXVpcmUoXCJwcm9jZXNzXCIpO1xuaW1wb3J0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcbmltcG9ydCBmcyA9IHJlcXVpcmUoXCJmc1wiKTtcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gXCJldmVudHNcIjtcbmltcG9ydCB7IFNlc3Npb24sIFNlc3Npb25TZXJ2aWNlIH0gZnJvbSBcIi4vY29tbW9uL3NlcnZpY2Uvc2Vzc2lvblNlcnZpY2VcIjtcbmltcG9ydCB7IGV2ZW50cyB9IGZyb20gXCIuL3BvbWVsb1wiO1xuaW1wb3J0IHsgaW52b2tlQ2FsbGJhY2sgfSBmcm9tIFwiLi91dGlsL3V0aWxzXCI7XG5pbXBvcnQgeyBydW5TZXJ2ZXJzIH0gZnJvbSBcIi4vbWFzdGVyL3N0YXJ0ZXJcIjtcbmltcG9ydCB7IENoYW5uZWxTZXJ2aWNlIH0gZnJvbSBcIi4vY29tbW9uL3NlcnZpY2UvY2hhbm5lbFNlcnZpY2VcIjtcbmltcG9ydCB7IHdhdGNoIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgYXBwTWFuYWdlciA9IHJlcXVpcmUoXCIuL2NvbW1vbi9tYW5hZ2VyL2FwcE1hbmFnZXJcIik7XG5pbXBvcnQge1xuICBCYWNrZW5kU2Vzc2lvblNlcnZpY2UsXG4gIENvbm5lY3Rpb25Db21wb25lbnQsXG4gIENvbm5lY3RvckNvbXBvbmVudCxcbiAgRGljdGlvbmFyeUNvbXBvbmVudCxcbiAgTWFzdGVyQ29tcG9uZW50LFxuICBNb25pdG9yQ29tcG9uZW50LFxuICBQcm90b2J1ZkNvbXBvbmVudCxcbiAgUHJveHlDb21wb25lbnQsXG4gIFB1c2hTY2hlZHVsZXJDb21wb25lbnQsXG4gIFJlbW90ZUNvbXBvbmVudCxcbiAgU2VydmVyQ29tcG9uZW50LFxuICBTZXNzaW9uQ29tcG9uZW50LFxuICBGSUxFUEFUSCxcbiAgS0VZV09SRFMsXG4gIFJFU0VSVkVELFxuICBMSUZFQ1lDTEUsXG4gIERJUixcbiAgVElNRSxcbiAgRnJvbnRlbmRTZXNzaW9uLFxuICBNb2R1bGVcbn0gZnJvbSBcIi4vaW5kZXhcIjtcbmltcG9ydCB7IEJhY2tlbmRTZXNzaW9uIH0gZnJvbSBcIi4uL2luZGV4XCI7XG5jb25zdCBhc3luYyA9IHJlcXVpcmUoXCJhc3luY1wiKTtcbmNvbnN0IExvZ2dlciA9IHJlcXVpcmUoXCJwb21lbG8tbG9nZ2VyXCIpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZShcInBvbWVsby1sb2dnZXJcIikuZ2V0TG9nZ2VyKFwicG9tZWxvXCIsIF9fZmlsZW5hbWUpO1xuXG5lbnVtIFN0YXRlIHtcbiAgU1RBVEVfSU5JVEVEID0gMSwgLy8gYXBwIGhhcyBpbml0ZWRcbiAgU1RBVEVfU1RBUlQgPSAyLCAvLyBhcHAgc3RhcnRcbiAgU1RBVEVfU1RBUlRFRCA9IDMsIC8vIGFwcCBoYXMgc3RhcnRlZFxuICBTVEFURV9TVE9QRUQgPSA0IC8vIGFwcCBoYXMgc3RvcGVkXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVySW5mbyB7XG4gIGlkOiBzdHJpbmc7XG4gIGhvc3Q6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xuICBzZXJ2ZXJUeXBlOiBzdHJpbmc7XG4gIGZyb250ZW5kPzogYm9vbGVhbiB8IHN0cmluZztcbiAgY2xpZW50SG9zdD86IHN0cmluZztcbiAgY2xpZW50UG9ydD86IG51bWJlcjtcbiAgY3B1PzogbnVtYmVyO1xuICBbaWR4OiBzdHJpbmddOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlQ29uc3RydWN0b3Ige1xuICAoLi4uYXJnczogYW55W10pOiBNb2R1bGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlSW5mbyB7XG4gIG1vZHVsZUlkOiBzdHJpbmc7XG4gIG1vZHVsZTogTW9kdWxlIHwgTW9kdWxlQ29uc3RydWN0b3I7XG4gIG9wdHM6IGFueTtcbn1cblxuZXhwb3J0IHR5cGUgTW9kdWxlSW5mb01hcCA9IHsgW2lkeDogc3RyaW5nXTogTW9kdWxlSW5mbyB9O1xuXG5leHBvcnQgdHlwZSBTZXJ2ZXJJbmZvQXJyYXlNYXAgPSB7IFtpZHg6IHN0cmluZ106IFNlcnZlckluZm9bXSB9O1xuZXhwb3J0IHR5cGUgU2VydmVySW5mb01hcCA9IHsgW2lkeDogc3RyaW5nXTogU2VydmVySW5mbyB9O1xuZXhwb3J0IHR5cGUgQ2x1c3RlclNlcU1hcCA9IHsgW2lkeDogc3RyaW5nXTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBMaWZlY3ljbGVDYnMgPSB7IFtpZHg6IHN0cmluZ106IEZ1bmN0aW9uIH07XG5leHBvcnQgdHlwZSBTZXR0aW5ncyA9IHsgW2lkeDogc3RyaW5nXTogYW55IH07XG5leHBvcnQgdHlwZSBBcmdzTWFwID0geyBbaWR4OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIENhbGxiYWNrTWFwID0geyBbaWR4OiBzdHJpbmddOiAoY2I6IEZ1bmN0aW9uKSA9PiB2b2lkIH07XG5leHBvcnQgdHlwZSBGdW5jdGlvbk1hcCA9IHsgW2lkeDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuZXhwb3J0IGludGVyZmFjZSBSUENJbnZva2VGdW5jIHtcbiAgKHNlcnZlcklkOiBzdHJpbmcsIG1zZzogYW55LCBjYj86IEZ1bmN0aW9uKTogdm9pZDtcbn1cblxuZXhwb3J0IHR5cGUgQmVmb3JlRmlsdGVyRnVuYyA9IChcbiAgbXNnOiBhbnksXG4gIHNlc3Npb246IEZyb250ZW5kU2Vzc2lvbnxCYWNrZW5kU2Vzc2lvbixcbiAgbmV4dDogRnVuY3Rpb25cbikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIEFmdGVyRmlsdGVyRnVuYyA9IChcbiAgZXJyOiBhbnksXG4gIG1zZzogYW55LFxuICBzZXNzaW9uOiBGcm9udGVuZFNlc3Npb258QmFja2VuZFNlc3Npb24sXG4gIHJlc3A6IGFueSxcbiAgbmV4dDogRnVuY3Rpb25cbikgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBGaWx0ZXIge1xuICBiZWZvcmUobXNnOiBhbnksIHNlc3Npb246IEZyb250ZW5kU2Vzc2lvbnxCYWNrZW5kU2Vzc2lvbiwgbmV4dDogRnVuY3Rpb24pOiB2b2lkO1xuICBhZnRlcihlcnI6IGFueSwgbXNnOiBhbnksIHNlc3Npb246IEZyb250ZW5kU2Vzc2lvbnxCYWNrZW5kU2Vzc2lvbiwgcmVzcDogYW55LCBuZXh0OiBGdW5jdGlvbik6IHZvaWQ7XG59XG5leHBvcnQgaW50ZXJmYWNlIFJQQ0ZpbHRlciB7XG4gIGJlZm9yZShzZXJ2ZXJJZDogc3RyaW5nLCBtc2c6IGFueSwgb3B0czogYW55LCBuZXh0OiBGdW5jdGlvbik6IHZvaWQ7XG4gIGFmdGVyKHNlcnZlcklkOiBzdHJpbmcsIG1zZzogYW55LCBvcHRzOiBhbnksIG5leHQ6IEZ1bmN0aW9uKTogdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcm9uIHtcbiAgaWQ6IG51bWJlcjtcbiAgdGltZTogc3RyaW5nO1xuICBhY3Rpb246IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnQge1xuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGFwcD86IEFwcGxpY2F0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjaGVkdWxlciB7XG4gIHN0YXJ0PyhjYj86IEZ1bmN0aW9uKTogdm9pZDtcbiAgc3RvcD8oY2I/OiBGdW5jdGlvbik6IHZvaWQ7XG4gIHNjaGVkdWxlKFxuICAgIHJlcUlkOiBudW1iZXIsXG4gICAgcm91dGU6IHN0cmluZyxcbiAgICBtc2c6IGFueSxcbiAgICByZWN2czogbnVtYmVyW10sXG4gICAgb3B0czogYW55LFxuICAgIGNiPzogRnVuY3Rpb25cbiAgKTogdm9pZDtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgU2NoZWR1bGVyQ29uc3RydWN0b3Ige1xuICAoLi4uYXJnczogYW55W10pOiBTY2hlZHVsZXI7XG59XG5cbmV4cG9ydCB0eXBlIFNjaGVkdWxlck1hcCA9IHsgW2lkeDogc3RyaW5nXTogU2NoZWR1bGVyIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLy9uZXcgKHBvcnQ6IG51bWJlciwgaG9zdDogc3RyaW5nLCBvcHRzPzphbnkpOiBUO1xuICBzdGFydChjYjogRnVuY3Rpb24pOiB2b2lkO1xuICBzdG9wKGZvcmNlOiBib29sZWFuLCBjYjogRnVuY3Rpb24pOiB2b2lkO1xuICBjbG9zZT8oKTogdm9pZDtcbiAgZW5jb2RlKHJlcUlkOiBudW1iZXIsIHJvdXRlOiBzdHJpbmcsIG1zZzogYW55LCBjYj86IEZ1bmN0aW9uKTogYW55O1xuICBkZWNvZGUobXNnOiBhbnksIHNlc3Npb246IFNlc3Npb24sIGNiPzogRnVuY3Rpb24pOiBhbnk7XG59XG5cbmV4cG9ydCB0eXBlIENvbm5lY3RvckVuY29kZUZ1bmMgPSAoXG4gIHJlcUlkOiBudW1iZXIsXG4gIHJvdXRlOiBzdHJpbmcsXG4gIG1zZzogYW55LFxuICBjYj86IEZ1bmN0aW9uXG4pID0+IGFueTtcbmV4cG9ydCB0eXBlIENvbm5lY3RvckRlY29kZUZ1bmMgPSAoXG4gIG1zZzogYW55LFxuICBzZXNzaW9uOiBTZXNzaW9uLFxuICBjYj86IEZ1bmN0aW9uXG4pID0+IGFueTtcbmV4cG9ydCB0eXBlIEJsYWNrbGlzdCA9IChSZWdFeHAgfCBzdHJpbmcpW107XG5leHBvcnQgdHlwZSBCbGFja2xpc3RGdW5jID0gKGNiOiAoZXJyOiBhbnksIGxpc3Q6IEJsYWNrbGlzdCkgPT4gdm9pZCkgPT4gdm9pZDtcblxuZXhwb3J0IGludGVyZmFjZSBBcHBDb21wb25lbnRzIHtcbiAgX19iYWNrZW5kU2Vzc2lvbl9fOiBCYWNrZW5kU2Vzc2lvblNlcnZpY2U7XG4gIF9fY2hhbm5lbF9fOiBDaGFubmVsU2VydmljZTtcbiAgX19jb25uZWN0aW9uX186IENvbm5lY3Rpb25Db21wb25lbnQ7XG4gIF9fY29ubmVjdG9yX186IENvbm5lY3RvckNvbXBvbmVudDtcbiAgX19kaWN0aW9uYXJ5X186IERpY3Rpb25hcnlDb21wb25lbnQ7XG4gIF9fbWFzdGVyX186IE1hc3RlckNvbXBvbmVudDtcbiAgX19tb25pdG9yX186IE1vbml0b3JDb21wb25lbnQ7XG4gIF9fcHJvdG9idWZfXzogUHJvdG9idWZDb21wb25lbnQ7XG4gIF9fcHJveHlfXzogUHJveHlDb21wb25lbnQ7XG4gIF9fcHVzaFNjaGVkdWxlcl9fOiBQdXNoU2NoZWR1bGVyQ29tcG9uZW50O1xuICBfX3JlbW90ZV9fOiBSZW1vdGVDb21wb25lbnQ7XG4gIF9fc2VydmVyX186IFNlcnZlckNvbXBvbmVudDtcbiAgX19zZXNzaW9uX186IFNlc3Npb25Db21wb25lbnQ7XG4gIFtpZHg6IHN0cmluZ106IENvbXBvbmVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXBwbGljYXRpb24ge1xuICByZWFkb25seSBldmVudDogRXZlbnRFbWl0dGVyO1xuICBzeXNycGM6IGFueTsgLy9UT0RPOnBvbWVsby1ycGNcblxuICBwcml2YXRlIF9jb21wb25lbnRzOiBBcHBDb21wb25lbnRzO1xuICBwcml2YXRlIF9zdG9wVGltZXI6IGFueTtcbiAgZ2V0IGNvbXBvbmVudHMoKTogUmVhZG9ubHk8QXBwQ29tcG9uZW50cz4ge1xuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRzO1xuICB9XG5cbiAgZ2V0IHNlcnZlcklkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELlNFUlZFUl9JRCk7XG4gIH1cblxuICBnZXRTZXJ2ZXJJZCgpIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJJZDtcbiAgfVxuXG4gIGdldCBzZXJ2ZXJUeXBlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELlNFUlZFUl9UWVBFKTtcbiAgfVxuXG4gIGdldCBjdXJTZXJ2ZXIoKTogU2VydmVySW5mbyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELkNVUlJFTlRfU0VSVkVSKTtcbiAgfVxuXG4gIHByaXZhdGUgX3N0YXJ0VGltZTogbnVtYmVyO1xuICBnZXQgc3RhcnRUaW1lKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXJ0VGltZTtcbiAgfVxuXG4gIHByaXZhdGUgX3NlcnZlcnM6IFNlcnZlckluZm9NYXA7XG4gIGdldCBzZXJ2ZXJzKCk6IFJlYWRvbmx5PFNlcnZlckluZm9NYXA+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VydmVycztcbiAgfVxuXG4gIHByaXZhdGUgX3NlcnZlclR5cGVNYXBzOiBTZXJ2ZXJJbmZvQXJyYXlNYXA7XG4gIGdldCBzZXJ2ZXJUeXBlTWFwcygpOiBSZWFkb25seTxTZXJ2ZXJJbmZvQXJyYXlNYXA+IHtcbiAgICByZXR1cm4gdGhpcy5fc2VydmVyVHlwZU1hcHM7XG4gIH1cblxuICBwcml2YXRlIF9zZXJ2ZXJUeXBlczogc3RyaW5nW107XG4gIGdldCBzZXJ2ZXJUeXBlcygpOiBSZWFkb25seTxzdHJpbmdbXT4ge1xuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXJUeXBlcztcbiAgfVxuXG4gIHByaXZhdGUgX2xpZmVjeWNsZUNiczogTGlmZWN5Y2xlQ2JzO1xuICBnZXQgbGlmZWN5Y2xlQ2JzKCk6IFJlYWRvbmx5PExpZmVjeWNsZUNicz4ge1xuICAgIHJldHVybiB0aGlzLl9saWZlY3ljbGVDYnM7XG4gIH1cblxuICBwcml2YXRlIF9jbHVzdGVyU2VxOiBDbHVzdGVyU2VxTWFwO1xuICBnZXQgY2x1c3RlclNlcSgpOiBSZWFkb25seTxDbHVzdGVyU2VxTWFwPiB7XG4gICAgcmV0dXJuIHRoaXMuX2NsdXN0ZXJTZXE7XG4gIH1cblxuICBwcml2YXRlIF9zZXR0aW5nczogU2V0dGluZ3M7XG4gIGdldCBzZXR0aW5ncygpOiBSZWFkb25seTxTZXR0aW5ncz4ge1xuICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgfVxuXG4gIGdldCBtYXN0ZXIoKTogU2VydmVySW5mbyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELk1BU1RFUik7XG4gIH1cblxuICBnZXQgYmFzZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldChSRVNFUlZFRC5CQVNFKTtcbiAgfVxuXG4gIGdldCBlbnYoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuRU5WKTtcbiAgfVxuXG4gIGdldCBtYWluKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELk1BSU4pO1xuICB9XG5cbiAgZ2V0IG1vZGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuTU9ERSk7XG4gIH1cblxuICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldChSRVNFUlZFRC5UWVBFKTtcbiAgfVxuXG4gIGdldCBzdGFydElkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELlNUQVJUSUQpO1xuICB9XG5cbiAgZ2V0IHNlcnZlcnNGcm9tQ29uZmlnKCk6IFNlcnZlckluZm9NYXAge1xuICAgIHJldHVybiB0aGlzLmdldChLRVlXT1JEUy5TRVJWRVJfTUFQKTtcbiAgfVxuXG4gIGdldFNlcnZlcnNGcm9tQ29uZmlnKCkge1xuICAgIHJldHVybiB0aGlzLnNlcnZlcnNGcm9tQ29uZmlnO1xuICB9XG5cbiAgZ2V0IGJhY2tlbmRTZXNzaW9uU2VydmljZSgpIHtcbiAgICByZXR1cm4gdGhpcy5nZXQoXCJiYWNrZW5kU2Vzc2lvblNlcnZpY2VcIik7XG4gIH1cblxuICBnZXQgY2hhbm5lbFNlcnZpY2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KFwiY2hhbm5lbFNlcnZpY2VcIik7XG4gIH1cblxuICBnZXQgcnBjSW52b2tlKCkge1xuICAgIHJldHVybiB0aGlzLmdldChcInJwY0ludm9rZVwiKTsgLy9UT0RPXG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBfaW5zdGFuY2U6IEFwcGxpY2F0aW9uO1xuICBzdGF0aWMgZ2V0IGluc3RhbmNlKCk6IEFwcGxpY2F0aW9uIHtcbiAgICBpZiAoIUFwcGxpY2F0aW9uLl9pbnN0YW5jZSkge1xuICAgICAgQXBwbGljYXRpb24uX2luc3RhbmNlID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gICAgfVxuICAgIHJldHVybiBBcHBsaWNhdGlvbi5faW5zdGFuY2U7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkZWQ6IGFueVtdO1xuICBwcml2YXRlIF9zdGF0ZTogU3RhdGU7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5ldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgICB0aGlzLl9sb2FkZWQgPSBbXTtcbiAgICB0aGlzLl9jb21wb25lbnRzID0ge30gYXMgQXBwQ29tcG9uZW50cztcbiAgICB0aGlzLl9zZXR0aW5ncyA9IHt9O1xuICAgIHRoaXMuX3NlcnZlcnMgPSB7fTtcbiAgICB0aGlzLl9zZXJ2ZXJUeXBlTWFwcyA9IHt9O1xuICAgIHRoaXMuX3NlcnZlclR5cGVzID0gW107XG4gICAgdGhpcy5fbGlmZWN5Y2xlQ2JzID0ge307XG4gICAgdGhpcy5fY2x1c3RlclNlcSA9IHt9O1xuICB9XG5cbiAgaW5pdChvcHRzPzogYW55KSB7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgbGV0IGJhc2UgPSBvcHRzLmJhc2UgfHwgcGF0aC5kaXJuYW1lKHJlcXVpcmUubWFpbiEuZmlsZW5hbWUpO1xuICAgIHRoaXMuc2V0KFJFU0VSVkVELkJBU0UsIGJhc2UpO1xuICAgIHRoaXMuZGVmYXVsdENvbmZpZ3VyYXRpb24oKTtcbiAgICB0aGlzLl9zdGF0ZSA9IFN0YXRlLlNUQVRFX0lOSVRFRDtcbiAgICBsb2dnZXIuaW5mbyhcImFwcGxpY2F0aW9uIGluaXRlZDogJWpcIiwgdGhpcy5zZXJ2ZXJJZCk7XG4gIH1cblxuICByZXF1aXJlKHBoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcmVxdWlyZShwYXRoLmpvaW4odGhpcy5iYXNlLCBwaCkpO1xuICB9XG5cbiAgY29uZmlndXJlTG9nZ2VyKGxvZ2dlcjogYW55KSB7XG4gICAgaWYgKHByb2Nlc3MuZW52LlBPTUVMT19MT0dHRVIgIT09IFwib2ZmXCIpIHtcbiAgICAgIGxldCBiYXNlID0gdGhpcy5iYXNlO1xuICAgICAgbGV0IGVudiA9IHRoaXMuZ2V0KFJFU0VSVkVELkVOVik7XG4gICAgICBsZXQgb3JpZ2luUGF0aCA9IHBhdGguam9pbihiYXNlLCBGSUxFUEFUSC5MT0cpO1xuICAgICAgbGV0IHByZXNlbnRQYXRoID0gcGF0aC5qb2luKFxuICAgICAgICBiYXNlLFxuICAgICAgICBGSUxFUEFUSC5DT05GSUdfRElSLFxuICAgICAgICBlbnYsXG4gICAgICAgIHBhdGguYmFzZW5hbWUoRklMRVBBVEguTE9HKVxuICAgICAgKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKG9yaWdpblBhdGgpKSB7XG4gICAgICAgIGxvZ2dlci5jb25maWd1cmUob3JpZ2luUGF0aCwgeyBzZXJ2ZXJJZDogdGhpcy5zZXJ2ZXJJZCwgYmFzZTogYmFzZSB9KTtcbiAgICAgIH0gZWxzZSBpZiAoZnMuZXhpc3RzU3luYyhwcmVzZW50UGF0aCkpIHtcbiAgICAgICAgbG9nZ2VyLmNvbmZpZ3VyZShwcmVzZW50UGF0aCwgeyBzZXJ2ZXJJZDogdGhpcy5zZXJ2ZXJJZCwgYmFzZTogYmFzZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcImxvZ2dlciBmaWxlIHBhdGggY29uZmlndXJhdGlvbiBpcyBlcnJvci5cIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZmlsdGVyKGZpbHRlcjogRmlsdGVyKSB7XG4gICAgdGhpcy5iZWZvcmUoZmlsdGVyKTtcbiAgICB0aGlzLmFmdGVyKGZpbHRlcik7XG4gIH1cblxuICBiZWZvcmUoYmY6IEZpbHRlcikge1xuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5CRUZPUkVfRklMVEVSLCBiZik7XG4gIH1cblxuICBhZnRlcihhZjogRmlsdGVyKSB7XG4gICAgYWRkRmlsdGVyKHRoaXMsIEtFWVdPUkRTLkFGVEVSX0ZJTFRFUiwgYWYpO1xuICB9XG5cbiAgZ2xvYmFsRmlsdGVyKGZpbHRlcjogRmlsdGVyKSB7XG4gICAgdGhpcy5nbG9iYWxCZWZvcmUoZmlsdGVyKTtcbiAgICB0aGlzLmdsb2JhbEFmdGVyKGZpbHRlcik7XG4gIH1cblxuICBnbG9iYWxCZWZvcmUoYmY6IEZpbHRlcikge1xuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5HTE9CQUxfQkVGT1JFX0ZJTFRFUiwgYmYpO1xuICB9XG5cbiAgZ2xvYmFsQWZ0ZXIoYWY6IEZpbHRlcikge1xuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5HTE9CQUxfQUZURVJfRklMVEVSLCBhZik7XG4gIH1cblxuICBycGNCZWZvcmUoYmY6IFJQQ0ZpbHRlcikge1xuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5SUENfQkVGT1JFX0ZJTFRFUiwgYmYpO1xuICB9XG5cbiAgcnBjQWZ0ZXIoYWY6IFJQQ0ZpbHRlcikge1xuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5SUENfQUZURVJfRklMVEVSLCBhZik7XG4gIH1cblxuICBycGNGaWx0ZXIoZmlsdGVyOiBSUENGaWx0ZXIpIHtcbiAgICB0aGlzLnJwY0JlZm9yZShmaWx0ZXIpO1xuICAgIHRoaXMucnBjQWZ0ZXIoZmlsdGVyKTtcbiAgfVxuXG4gIGxvYWQoY29tcG9uZW50OiBDb21wb25lbnQgfCBGdW5jdGlvbiwgb3B0cz86IHt9KSB7XG4gICAgbGV0IG5hbWU6IHN0cmluZyA9IDxhbnk+bnVsbDtcbiAgICBpZiAodHlwZW9mIGNvbXBvbmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb21wb25lbnQgPSBjb21wb25lbnQodGhpcywgb3B0cyk7XG4gICAgfVxuXG4gICAgaWYgKCFuYW1lICYmIHR5cGVvZiBjb21wb25lbnQubmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbmFtZSA9IGNvbXBvbmVudC5uYW1lO1xuICAgIH1cblxuICAgIGlmIChuYW1lICYmIHRoaXMuY29tcG9uZW50c1tuYW1lXSkge1xuICAgICAgLy8gaWdub3JlIGR1cGxpY2F0IGNvbXBvbmVudFxuICAgICAgbG9nZ2VyLndhcm4oXCJpZ25vcmUgZHVwbGljYXRlIGNvbXBvbmVudDogJWpcIiwgbmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fbG9hZGVkLnB1c2goY29tcG9uZW50KTtcbiAgICBpZiAobmFtZSkge1xuICAgICAgLy8gY29tcG9uZW50cyB3aXRoIGEgbmFtZSB3b3VsZCBnZXQgYnkgbmFtZSB0aHJvdWdodCBhcHAuY29tcG9uZW50cyBsYXRlci5cbiAgICAgIHRoaXMuX2NvbXBvbmVudHNbbmFtZV0gPSBjb21wb25lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsb2FkQ29uZmlnQmFzZUFwcChrZXk6IHN0cmluZywgdmFsOiBzdHJpbmcsIHJlbG9hZDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgbGV0IGVudiA9IHRoaXMuZ2V0KFJFU0VSVkVELkVOVik7XG4gICAgbGV0IG9yaWdpblBhdGggPSBwYXRoLmpvaW4odGhpcy5iYXNlLCB2YWwpO1xuICAgIGxldCBwcmVzZW50UGF0aCA9IHBhdGguam9pbihcbiAgICAgIHRoaXMuYmFzZSxcbiAgICAgIEZJTEVQQVRILkNPTkZJR19ESVIsXG4gICAgICBlbnYsXG4gICAgICBwYXRoLmJhc2VuYW1lKHZhbClcbiAgICApO1xuICAgIGxldCByZWFsUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKG9yaWdpblBhdGgpKSB7XG4gICAgICByZWFsUGF0aCA9IG9yaWdpblBhdGg7XG4gICAgICBsZXQgZmlsZSA9IHJlcXVpcmUob3JpZ2luUGF0aCk7XG4gICAgICBpZiAoZmlsZVtlbnZdKSB7XG4gICAgICAgIGZpbGUgPSBmaWxlW2Vudl07XG4gICAgICB9XG4gICAgICB0aGlzLnNldChrZXksIGZpbGUpO1xuICAgIH0gZWxzZSBpZiAoZnMuZXhpc3RzU3luYyhwcmVzZW50UGF0aCkpIHtcbiAgICAgIHJlYWxQYXRoID0gcHJlc2VudFBhdGg7XG4gICAgICBsZXQgcGZpbGUgPSByZXF1aXJlKHByZXNlbnRQYXRoKTtcbiAgICAgIHRoaXMuc2V0KGtleSwgcGZpbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXCJpbnZhbGlkIGNvbmZpZ3VyYXRpb24gd2l0aCBmaWxlIHBhdGg6ICVzXCIsIGtleSk7XG4gICAgfVxuXG4gICAgaWYgKCEhcmVhbFBhdGggJiYgISFyZWxvYWQpIHtcbiAgICAgIGZzLndhdGNoKHJlYWxQYXRoLCAoZXZlbnQsIGZpbGVuYW1lKSA9PiB7XG4gICAgICAgIGlmIChldmVudCA9PT0gXCJjaGFuZ2VcIikge1xuICAgICAgICAgIGRlbGV0ZSByZXF1aXJlLmNhY2hlW3JlcXVpcmUucmVzb2x2ZShyZWFsUGF0aCEpXTtcbiAgICAgICAgICB0aGlzLmxvYWRDb25maWdCYXNlQXBwKGtleSwgdmFsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgbG9hZENvbmZpZyhrZXk6IHN0cmluZywgdmFsOiBzdHJpbmcpIHtcbiAgICBsZXQgZW52ID0gdGhpcy5nZXQoUkVTRVJWRUQuRU5WKTtcbiAgICBsZXQgbW9kID0gcmVxdWlyZSh2YWwpO1xuICAgIGlmIChtb2RbZW52XSkge1xuICAgICAgbW9kID0gbW9kW2Vudl07XG4gICAgfVxuICAgIHRoaXMuc2V0KGtleSwgbW9kKTtcbiAgfVxuXG4gIHJvdXRlKHNlcnZlclR5cGU6IHN0cmluZywgcm91dGVGdW5jOiBGdW5jdGlvbikge1xuICAgIGxldCByb3V0ZXMgPSB0aGlzLmdldChLRVlXT1JEUy5ST1VURSk7XG4gICAgaWYgKCFyb3V0ZXMpIHtcbiAgICAgIHJvdXRlcyA9IHt9O1xuICAgICAgdGhpcy5zZXQoS0VZV09SRFMuUk9VVEUsIHJvdXRlcyk7XG4gICAgfVxuICAgIHJvdXRlc1tzZXJ2ZXJUeXBlXSA9IHJvdXRlRnVuYztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHN0YXJ0KGNiPzogRnVuY3Rpb24pIHtcbiAgICB0aGlzLl9zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgIGlmICh0aGlzLl9zdGF0ZSA+IFN0YXRlLlNUQVRFX0lOSVRFRCkge1xuICAgICAgaW52b2tlQ2FsbGJhY2soY2IhLCBuZXcgRXJyb3IoXCJhcHBsaWNhdGlvbiBoYXMgYWxyZWFkeSBzdGFydC5cIikpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc3RhcnRCeVR5cGUoKCkgPT4ge1xuICAgICAgdGhpcy5sb2FkRGVmYXVsdENvbXBvbmVudHMoKTtcbiAgICAgIGxldCBzdGFydFVwID0gKCkgPT4ge1xuICAgICAgICB0aGlzLm9wdENvbXBvbmVudHModGhpcy5fbG9hZGVkLCBSRVNFUlZFRC5TVEFSVCwgKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgdGhpcy5fc3RhdGUgPSBTdGF0ZS5TVEFURV9TVEFSVDtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBpbnZva2VDYWxsYmFjayhjYiEsIGVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKFwiJWogZW50ZXIgYWZ0ZXIgc3RhcnQuLi5cIiwgdGhpcy5zZXJ2ZXJJZCk7XG4gICAgICAgICAgICB0aGlzLmFmdGVyU3RhcnQoY2IhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGxldCBiZWZvcmVGdW4gPSB0aGlzLmxpZmVjeWNsZUNic1tMSUZFQ1lDTEUuQkVGT1JFX1NUQVJUVVBdO1xuICAgICAgaWYgKCEhYmVmb3JlRnVuKSB7XG4gICAgICAgIGJlZm9yZUZ1bi5jYWxsKG51bGwsIHRoaXMsIHN0YXJ0VXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRVcCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgYWZ0ZXJTdGFydChjYjogRnVuY3Rpb24pIHtcbiAgICBpZiAodGhpcy5fc3RhdGUgIT09IFN0YXRlLlNUQVRFX1NUQVJUKSB7XG4gICAgICBpbnZva2VDYWxsYmFjayhjYiwgbmV3IEVycm9yKFwiYXBwbGljYXRpb24gaXMgbm90IHJ1bm5pbmcgbm93LlwiKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGFmdGVyRnVuID0gdGhpcy5saWZlY3ljbGVDYnNbTElGRUNZQ0xFLkFGVEVSX1NUQVJUVVBdO1xuICAgIHRoaXMub3B0Q29tcG9uZW50cyh0aGlzLl9sb2FkZWQsIFJFU0VSVkVELkFGVEVSX1NUQVJULCAoZXJyOiBhbnkpID0+IHtcbiAgICAgIHRoaXMuX3N0YXRlID0gU3RhdGUuU1RBVEVfU1RBUlRFRDtcbiAgICAgIGxldCBpZCA9IHRoaXMuc2VydmVySWQ7XG4gICAgICBpZiAoIWVycikge1xuICAgICAgICBsb2dnZXIuaW5mbyhcIiVqIGZpbmlzaCBzdGFydFwiLCBpZCk7XG4gICAgICB9XG4gICAgICBpZiAoISFhZnRlckZ1bikge1xuICAgICAgICBhZnRlckZ1bi5jYWxsKG51bGwsIHRoaXMsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGludm9rZUNhbGxiYWNrKGNiLCBlcnIpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGludm9rZUNhbGxiYWNrKGNiLCBlcnIpO1xuICAgICAgfVxuICAgICAgbGV0IHVzZWRUaW1lID0gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lO1xuICAgICAgbG9nZ2VyLmluZm8oXCIlaiBzdGFydHVwIGluICVzIG1zXCIsIGlkLCB1c2VkVGltZSk7XG4gICAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLlNUQVJUX1NFUlZFUiwgaWQpO1xuICAgIH0pO1xuICB9XG5cbiAgc3RvcChmb3JjZT86IGJvb2xlYW4pIHtcbiAgICBpZiAodGhpcy5fc3RhdGUgPiBTdGF0ZS5TVEFURV9TVEFSVEVEKSB7XG4gICAgICBsb2dnZXIud2FybihcIltwb21lbG8gYXBwbGljYXRpb25dIGFwcGxpY2F0aW9uIGlzIG5vdCBydW5uaW5nIG5vdy5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3N0YXRlID0gU3RhdGUuU1RBVEVfU1RPUEVEO1xuICAgIGxldCBzZWxmID0gdGhpcztcblxuICAgIHRoaXMuX3N0b3BUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH0sIFRJTUUuVElNRV9XQUlUX1NUT1ApO1xuXG4gICAgbGV0IGNhbmNlbFNodXREb3duVGltZXIgPSAoKSA9PiB7XG4gICAgICBpZiAoISFzZWxmLl9zdG9wVGltZXIpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHNlbGYuX3N0b3BUaW1lcik7XG4gICAgICB9XG4gICAgfTtcbiAgICBsZXQgc2h1dERvd24gPSAoKSA9PiB7XG4gICAgICB0aGlzLnN0b3BDb21wcyhzZWxmLl9sb2FkZWQsIDAsIGZvcmNlISwgKCkgPT4ge1xuICAgICAgICBjYW5jZWxTaHV0RG93blRpbWVyKCk7XG4gICAgICAgIGlmIChmb3JjZSkge1xuICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgICBsZXQgZnVuID0gdGhpcy5nZXQoS0VZV09SRFMuQkVGT1JFX1NUT1BfSE9PSyk7XG4gICAgbGV0IHN0b3BGdW4gPSB0aGlzLmxpZmVjeWNsZUNic1tMSUZFQ1lDTEUuQkVGT1JFX1NIVVRET1dOXTtcbiAgICBpZiAoISFzdG9wRnVuKSB7XG4gICAgICBzdG9wRnVuLmNhbGwobnVsbCwgdGhpcywgc2h1dERvd24sIGNhbmNlbFNodXREb3duVGltZXIpO1xuICAgIH0gZWxzZSBpZiAoISFmdW4pIHtcbiAgICAgIGludm9rZUNhbGxiYWNrKGZ1biwgc2VsZiwgc2h1dERvd24sIGNhbmNlbFNodXREb3duVGltZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaHV0RG93bigpO1xuICAgIH1cbiAgfVxuXG4gIHNldChzZXR0aW5nOiBzdHJpbmcsIHZhbDogYW55KSB7XG4gICAgdGhpcy5fc2V0dGluZ3Nbc2V0dGluZ10gPSB2YWw7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBnZXQoa2V5OiBcInJwY0ludm9rZVwiKTogUlBDSW52b2tlRnVuYztcbiAgZ2V0KGtleTogXCJtYXN0ZXJcIik6IFNlcnZlckluZm87XG4gIGdldChrZXk6IFwiYmFzZVwiKTogc3RyaW5nO1xuICBnZXQoa2V5OiBcImVudlwiKTogc3RyaW5nO1xuICBnZXQoa2V5OiBcIm1haW5cIik6IHN0cmluZztcbiAgZ2V0KGtleTogXCJtb2RlXCIpOiBzdHJpbmc7XG4gIGdldChrZXk6IFwidHlwZVwiKTogc3RyaW5nO1xuICBnZXQoa2V5OiBcInNlcnZlclR5cGVcIik6IHN0cmluZztcbiAgZ2V0KGtleTogXCJzZXJ2ZXJJZFwiKTogc3RyaW5nO1xuICBnZXQoa2V5OiBcInN0YXJ0SWRcIik6IHN0cmluZztcbiAgZ2V0KGtleTogXCJzZXJ2ZXJzXCIpOiBTZXJ2ZXJJbmZvQXJyYXlNYXA7XG4gIGdldChrZXk6IFwiY2hhbm5lbFNlcnZpY2VcIik6IENoYW5uZWxTZXJ2aWNlO1xuICBnZXQoa2V5OiBcImJhY2tlbmRTZXNzaW9uU2VydmljZVwiKTogQmFja2VuZFNlc3Npb25TZXJ2aWNlO1xuICBnZXQoa2V5OiBcIl9fbW9kdWxlc19fXCIpOiBNb2R1bGVJbmZvTWFwO1xuICBnZXQoa2V5OiBcInNlc3Npb25TZXJ2aWNlXCIpOiBTZXNzaW9uU2VydmljZTtcbiAgZ2V0KGtleTogc3RyaW5nKTogYW55O1xuICAvKiDlpoLmnpzopoHnu5lBcHBsaWNhdG9pbi5nZXTliqDkuIrmlrDnmoRrZXnvvIzlj6/ku6XlnKjpnIDopoHnmoTlnLDmlrnlpoLkuIvov5nmoLdtZXJnZei/m+WFpUFwcGxpY2F0aW9uOlxuICBpbXBvcnQgJ3BhdGhfdG8vYXBwbGljYXRpb24nXG5pbXBvcnQgeyBDaGFubmVsU2VydmljZSB9IGZyb20gJy4vY29tbW9uL3NlcnZpY2UvY2hhbm5lbFNlcnZpY2UnO1xuaW1wb3J0IHsgU2Vzc2lvbkNvbXBvbmVudCB9IGZyb20gJy4uLy4uLy4uL2dpdGVlL3BvbWVsby10cy9wb21lbG8vaW5kZXgnO1xuaW1wb3J0IHsgUkVTRVJWRUQgfSBmcm9tICcuL3V0aWwvY29uc3RhbnRzJztcbiAgZGVjbGFyZSBtb2R1bGUgJ3BhdGhfdG8vYXBwbGljYXRpb24nIHtcbiAgICBleHBvcnQgaW50ZXJmYWNlIEFwcGxpY2F0aW9uIHtcbiAgICAgIGdldChzZXR0aW5nOiAnbXlrZXknKTpTb21lVHlwZTtcbiAgICB9XG4gIH1cbiAgKi9cbiAgZ2V0KHNldHRpbmc6IHN0cmluZyk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzW3NldHRpbmddO1xuICB9XG5cbiAgZW5hYmxlZChzZXR0aW5nOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gISF0aGlzLmdldChzZXR0aW5nKTtcbiAgfVxuXG4gIGRpc2FibGVkKHNldHRpbmc6IHN0cmluZykge1xuICAgIHJldHVybiAhdGhpcy5nZXQoc2V0dGluZyk7XG4gIH1cblxuICBlbmFibGUoc2V0dGluZzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuc2V0KHNldHRpbmcsIHRydWUpO1xuICB9XG5cbiAgZGlzYWJsZShzZXR0aW5nOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5zZXQoc2V0dGluZywgZmFsc2UpO1xuICB9XG5cbiAgY29uZmlndXJlKGVudjogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgIGxldCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIGZuID0gYXJncy5wb3AoKTtcbiAgICBlbnYgPSB0eXBlID0gUkVTRVJWRUQuQUxMO1xuXG4gICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgZW52ID0gYXJnc1swXTtcbiAgICB9XG4gICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdHlwZSA9IGFyZ3NbMV07XG4gICAgfVxuXG4gICAgaWYgKGVudiA9PT0gUkVTRVJWRUQuQUxMIHx8IGNvbnRhaW5zKHRoaXMuc2V0dGluZ3MuZW52LCBlbnYpKSB7XG4gICAgICBpZiAodHlwZSA9PT0gUkVTRVJWRUQuQUxMIHx8IGNvbnRhaW5zKHRoaXMuc2V0dGluZ3Muc2VydmVyVHlwZSwgdHlwZSkpIHtcbiAgICAgICAgZm4uY2FsbCh0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICByZWdpc3RlckFkbWluKFxuICAgIG1vZHVsZUlkOiBhbnksXG4gICAgbW9kdWxlPzogTW9kdWxlIHwgRnVuY3Rpb24gfCBhbnksXG4gICAgb3B0cz86IGFueVxuICApIHtcbiAgICBsZXQgbW9kdWxlczogTW9kdWxlSW5mb01hcCA9IHRoaXMuZ2V0KEtFWVdPUkRTLk1PRFVMRSk7XG4gICAgaWYgKCFtb2R1bGVzKSB7XG4gICAgICBtb2R1bGVzID0ge307XG4gICAgICB0aGlzLnNldChLRVlXT1JEUy5NT0RVTEUsIG1vZHVsZXMpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbW9kdWxlSWQgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG9wdHMgPSBtb2R1bGU7XG4gICAgICBtb2R1bGUgPSBtb2R1bGVJZDtcbiAgICAgIGlmIChtb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlSWQgPSAoPE1vZHVsZT5tb2R1bGUpLm1vZHVsZUlkO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbW9kdWxlSWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBtb2R1bGVzW21vZHVsZUlkXSA9IHtcbiAgICAgIG1vZHVsZUlkOiBtb2R1bGVJZCxcbiAgICAgIG1vZHVsZTogbW9kdWxlLFxuICAgICAgb3B0czogb3B0c1xuICAgIH07XG4gIH1cblxuICB1c2UocGx1Z2luOiBhbnksIG9wdHM/OiBhbnkpIHtcbiAgICBpZiAoIXBsdWdpbi5jb21wb25lbnRzKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXCJpbnZhbGlkIGNvbXBvbmVudHMsIG5vIGNvbXBvbmVudHMgZXhpc3RcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgbGV0IGRpciA9IHBhdGguZGlybmFtZShwbHVnaW4uY29tcG9uZW50cyk7XG5cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGx1Z2luLmNvbXBvbmVudHMpKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoXCJmYWlsIHRvIGZpbmQgY29tcG9uZW50cywgZmluZCBwYXRoOiAlc1wiLCBwbHVnaW4uY29tcG9uZW50cyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnMucmVhZGRpclN5bmMocGx1Z2luLmNvbXBvbmVudHMpLmZvckVhY2goZmlsZW5hbWUgPT4ge1xuICAgICAgaWYgKCEvXFwuanMkLy50ZXN0KGZpbGVuYW1lKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZW5hbWUsIFwiLmpzXCIpO1xuICAgICAgbGV0IHBhcmFtID0gb3B0c1tuYW1lXSB8fCB7fTtcbiAgICAgIGxldCBhYnNvbHV0ZVBhdGggPSBwYXRoLmpvaW4oZGlyLCBESVIuQ09NUE9ORU5ULCBmaWxlbmFtZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzb2x1dGVQYXRoKSkge1xuICAgICAgICBsb2dnZXIuZXJyb3IoXCJjb21wb25lbnQgJXMgbm90IGV4aXN0IGF0ICVzXCIsIG5hbWUsIGFic29sdXRlUGF0aCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvYWQocmVxdWlyZShhYnNvbHV0ZVBhdGgpLCBwYXJhbSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBsb2FkIGV2ZW50c1xuICAgIGlmICghcGx1Z2luLmV2ZW50cykge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGx1Z2luLmV2ZW50cykpIHtcbiAgICAgICAgbG9nZ2VyLmVycm9yKFwiZmFpbCB0byBmaW5kIGV2ZW50cywgZmluZCBwYXRoOiAlc1wiLCBwbHVnaW4uZXZlbnRzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmcy5yZWFkZGlyU3luYyhwbHVnaW4uZXZlbnRzKS5mb3JFYWNoKGZpbGVuYW1lID0+IHtcbiAgICAgICAgaWYgKCEvXFwuanMkLy50ZXN0KGZpbGVuYW1lKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgYWJzb2x1dGVQYXRoID0gcGF0aC5qb2luKGRpciwgRElSLkVWRU5ULCBmaWxlbmFtZSk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNvbHV0ZVBhdGgpKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKFwiZXZlbnRzICVzIG5vdCBleGlzdCBhdCAlc1wiLCBmaWxlbmFtZSwgYWJzb2x1dGVQYXRoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiaW5kRXZlbnRzKHJlcXVpcmUoYWJzb2x1dGVQYXRoKSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHRyYW5zYWN0aW9uKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBjb25kaXRpb25zOiBDYWxsYmFja01hcCxcbiAgICBoYW5kbGVyczogQ2FsbGJhY2tNYXAsXG4gICAgcmV0cnk6IG51bWJlclxuICApIHtcbiAgICBhcHBNYW5hZ2VyLnRyYW5zYWN0aW9uKG5hbWUsIGNvbmRpdGlvbnMsIGhhbmRsZXJzLCByZXRyeSk7XG4gIH1cblxuICBnZXRTZXJ2ZXJCeUlkKHNlcnZlcklkOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5fc2VydmVyc1tzZXJ2ZXJJZF07XG4gIH1cblxuICBnZXRTZXJ2ZXJGcm9tQ29uZmlnKHNlcnZlcklkOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJzRnJvbUNvbmZpZ1tzZXJ2ZXJJZF07XG4gIH1cblxuICBnZXRTZXJ2ZXJzQnlUeXBlKHNlcnZlclR5cGU6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXJUeXBlTWFwc1tzZXJ2ZXJUeXBlXTtcbiAgfVxuXG4gIGlzRnJvbnRlbmQoc2VydmVyPzogU2VydmVySW5mbykge1xuICAgIHNlcnZlciA9IHNlcnZlciB8fCB0aGlzLmN1clNlcnZlcjtcbiAgICByZXR1cm4gISFzZXJ2ZXIgJiYgc2VydmVyLmZyb250ZW5kID09PSBcInRydWVcIjtcbiAgfVxuXG4gIGlzQmFja2VuZChzZXJ2ZXI/OiBTZXJ2ZXJJbmZvKSB7XG4gICAgc2VydmVyID0gc2VydmVyIHx8IHRoaXMuY3VyU2VydmVyO1xuICAgIHJldHVybiAhIXNlcnZlciAmJiAhc2VydmVyLmZyb250ZW5kO1xuICB9XG5cbiAgaXNNYXN0ZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmVyVHlwZSA9PT0gUkVTRVJWRUQuTUFTVEVSO1xuICB9XG5cbiAgYWRkU2VydmVycyhzZXJ2ZXJzOiBTZXJ2ZXJJbmZvW10pIHtcbiAgICBpZiAoIXNlcnZlcnMgfHwgIXNlcnZlcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBzZXJ2ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGV0IGl0ZW0gPSBzZXJ2ZXJzW2ldO1xuICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzZXJ2ZXIgbWFwXG4gICAgICB0aGlzLl9zZXJ2ZXJzW2l0ZW0uaWRdID0gaXRlbTtcblxuICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzZXJ2ZXIgdHlwZSBtYXBcbiAgICAgIGxldCBzbGlzdCA9IHRoaXMuX3NlcnZlclR5cGVNYXBzW2l0ZW0uc2VydmVyVHlwZV07XG4gICAgICBpZiAoIXNsaXN0KSB7XG4gICAgICAgIHRoaXMuX3NlcnZlclR5cGVNYXBzW2l0ZW0uc2VydmVyVHlwZV0gPSBzbGlzdCA9IFtdO1xuICAgICAgfVxuICAgICAgcmVwbGFjZVNlcnZlcihzbGlzdCwgaXRlbSk7XG5cbiAgICAgIC8vIHVwZGF0ZSBnbG9iYWwgc2VydmVyIHR5cGUgbGlzdFxuICAgICAgaWYgKHRoaXMuc2VydmVyVHlwZXMuaW5kZXhPZihpdGVtLnNlcnZlclR5cGUpIDwgMCkge1xuICAgICAgICB0aGlzLnNlcnZlclR5cGVzLnB1c2goaXRlbS5zZXJ2ZXJUeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ldmVudC5lbWl0KGV2ZW50cy5BRERfU0VSVkVSUywgc2VydmVycyk7XG4gIH1cblxuICByZW1vdmVTZXJ2ZXJzKGlkczogc3RyaW5nW10pIHtcbiAgICBpZiAoIWlkcyB8fCAhaWRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gaWRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGV0IGlkID0gaWRzW2ldO1xuICAgICAgbGV0IGl0ZW0gPSB0aGlzLnNlcnZlcnNbaWRdO1xuICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gY2xlYW4gZ2xvYmFsIHNlcnZlciBtYXBcbiAgICAgIGRlbGV0ZSB0aGlzLl9zZXJ2ZXJzW2lkXTtcblxuICAgICAgLy8gY2xlYW4gZ2xvYmFsIHNlcnZlciB0eXBlIG1hcFxuICAgICAgbGV0IHNsaXN0ID0gdGhpcy5fc2VydmVyVHlwZU1hcHNbaXRlbS5zZXJ2ZXJUeXBlXTtcbiAgICAgIHJlbW92ZVNlcnZlcihzbGlzdCwgaWQpO1xuICAgICAgLy8gVE9ETzogc2hvdWxkIHJlbW92ZSB0aGUgc2VydmVyIHR5cGUgaWYgdGhlIHNsaXN0IGlzIGVtcHR5P1xuICAgIH1cbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLlJFTU9WRV9TRVJWRVJTLCBpZHMpO1xuICB9XG5cbiAgcmVwbGFjZVNlcnZlcnMoc2VydmVyczogU2VydmVySW5mb01hcCkge1xuICAgIGlmICghc2VydmVycykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NlcnZlcnMgPSBzZXJ2ZXJzO1xuICAgIHRoaXMuX3NlcnZlclR5cGVNYXBzID0ge307XG4gICAgdGhpcy5fc2VydmVyVHlwZXMgPSBbXTtcbiAgICBsZXQgc2VydmVyQXJyYXkgPSBbXTtcbiAgICBmb3IgKGxldCBpZCBpbiBzZXJ2ZXJzKSB7XG4gICAgICBsZXQgc2VydmVyID0gc2VydmVyc1tpZF07XG4gICAgICBsZXQgc2VydmVyVHlwZSA9IHNlcnZlcltSRVNFUlZFRC5TRVJWRVJfVFlQRV07XG4gICAgICBsZXQgc2xpc3QgPSB0aGlzLl9zZXJ2ZXJUeXBlTWFwc1tzZXJ2ZXJUeXBlXTtcbiAgICAgIGlmICghc2xpc3QpIHtcbiAgICAgICAgdGhpcy5fc2VydmVyVHlwZU1hcHNbc2VydmVyVHlwZV0gPSBzbGlzdCA9IFtdO1xuICAgICAgfVxuICAgICAgdGhpcy5fc2VydmVyVHlwZU1hcHNbc2VydmVyVHlwZV0ucHVzaChzZXJ2ZXIpO1xuICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzZXJ2ZXIgdHlwZSBsaXN0XG4gICAgICBpZiAodGhpcy5fc2VydmVyVHlwZXMuaW5kZXhPZihzZXJ2ZXJUeXBlKSA8IDApIHtcbiAgICAgICAgdGhpcy5fc2VydmVyVHlwZXMucHVzaChzZXJ2ZXJUeXBlKTtcbiAgICAgIH1cbiAgICAgIHNlcnZlckFycmF5LnB1c2goc2VydmVyKTtcbiAgICB9XG4gICAgdGhpcy5ldmVudC5lbWl0KGV2ZW50cy5SRVBMQUNFX1NFUlZFUlMsIHNlcnZlckFycmF5KTtcbiAgfVxuXG4gIGFkZENyb25zKGNyb25zOiBDcm9uW10pIHtcbiAgICBpZiAoIWNyb25zIHx8ICFjcm9ucy5sZW5ndGgpIHtcbiAgICAgIGxvZ2dlci53YXJuKFwiY3JvbnMgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLkFERF9DUk9OUywgY3JvbnMpO1xuICB9XG5cbiAgcmVtb3ZlQ3JvbnMoY3JvbnM6IENyb25bXSkge1xuICAgIGlmICghY3JvbnMgfHwgIWNyb25zLmxlbmd0aCkge1xuICAgICAgbG9nZ2VyLndhcm4oXCJpZHMgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLlJFTU9WRV9DUk9OUywgY3JvbnMpO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkU2VydmVycygpIHtcbiAgICB0aGlzLmxvYWRDb25maWdCYXNlQXBwKFJFU0VSVkVELlNFUlZFUlMsIEZJTEVQQVRILlNFUlZFUik7XG4gICAgY29uc3Qgc2VydmVycyA9IHRoaXMuZ2V0KFJFU0VSVkVELlNFUlZFUlMpIGFzIFNlcnZlckluZm9BcnJheU1hcDtcbiAgICBsZXQgc2VydmVyTWFwOiBTZXJ2ZXJJbmZvTWFwID0ge307XG4gICAgZm9yIChsZXQgc2VydmVyVHlwZSBpbiBzZXJ2ZXJzKSB7XG4gICAgICBsZXQgc2xpc3QgPSBzZXJ2ZXJzW3NlcnZlclR5cGVdO1xuICAgICAgZm9yIChsZXQgc2VydmVyIG9mIHNsaXN0KSB7XG4gICAgICAgIHNlcnZlci5zZXJ2ZXJUeXBlID0gc2VydmVyVHlwZTtcbiAgICAgICAgaWYgKHNlcnZlcltSRVNFUlZFRC5DTFVTVEVSX0NPVU5UXSkge1xuICAgICAgICAgIHRoaXMubG9hZENsdXN0ZXIoc2VydmVyLCBzZXJ2ZXJNYXApO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHNlcnZlck1hcFtzZXJ2ZXIuaWRdID0gc2VydmVyO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnNldChLRVlXT1JEUy5TRVJWRVJfTUFQLCBzZXJ2ZXJNYXApO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm9jZXNzQXJncyhhcmdzOiBBcmdzTWFwKSB7XG4gICAgbGV0IHNlcnZlclR5cGUgPSBhcmdzLnNlcnZlclR5cGUgfHwgUkVTRVJWRUQuTUFTVEVSO1xuICAgIGxldCBzZXJ2ZXJJZCA9IGFyZ3MuaWQgfHwgdGhpcy5tYXN0ZXIuaWQ7XG4gICAgbGV0IG1vZGUgPSBhcmdzLm1vZGUgfHwgUkVTRVJWRUQuQ0xVU1RFUjtcbiAgICBsZXQgbWFzdGVyaGEgPSBhcmdzLm1hc3RlcmhhIHx8IFwiZmFsc2VcIjtcbiAgICBsZXQgdHlwZSA9IGFyZ3MudHlwZSB8fCBSRVNFUlZFRC5BTEw7XG4gICAgbGV0IHN0YXJ0SWQgPSBhcmdzLnN0YXJ0SWQ7XG5cbiAgICB0aGlzLnNldChSRVNFUlZFRC5NQUlOLCBhcmdzLm1haW4pO1xuICAgIHRoaXMuc2V0KFJFU0VSVkVELlNFUlZFUl9UWVBFLCBzZXJ2ZXJUeXBlKTtcbiAgICB0aGlzLnNldChSRVNFUlZFRC5TRVJWRVJfSUQsIHNlcnZlcklkKTtcbiAgICB0aGlzLnNldChSRVNFUlZFRC5NT0RFLCBtb2RlKTtcbiAgICB0aGlzLnNldChSRVNFUlZFRC5UWVBFLCB0eXBlKTtcbiAgICBpZiAoISFzdGFydElkKSB7XG4gICAgICB0aGlzLnNldChSRVNFUlZFRC5TVEFSVElELCBzdGFydElkKTtcbiAgICB9XG5cbiAgICBpZiAobWFzdGVyaGEgPT09IFwidHJ1ZVwiKSB7XG4gICAgICB0aGlzLnNldChSRVNFUlZFRC5NQVNURVIsIGFyZ3MpO1xuICAgICAgdGhpcy5zZXQoUkVTRVJWRUQuQ1VSUkVOVF9TRVJWRVIsIGFyZ3MpO1xuICAgIH0gZWxzZSBpZiAoc2VydmVyVHlwZSAhPT0gUkVTRVJWRUQuTUFTVEVSKSB7XG4gICAgICB0aGlzLnNldChSRVNFUlZFRC5DVVJSRU5UX1NFUlZFUiwgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0KFJFU0VSVkVELkNVUlJFTlRfU0VSVkVSLCB0aGlzLm1hc3Rlcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb25maWdMb2dnZXIoKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52LlBPTUVMT19MT0dHRVIgIT09IFwib2ZmXCIpIHtcbiAgICAgIGxldCBlbnYgPSB0aGlzLmdldChSRVNFUlZFRC5FTlYpO1xuICAgICAgbGV0IG9yaWdpblBhdGggPSBwYXRoLmpvaW4odGhpcy5iYXNlLCBGSUxFUEFUSC5MT0cpO1xuICAgICAgbGV0IHByZXNlbnRQYXRoID0gcGF0aC5qb2luKFxuICAgICAgICB0aGlzLmJhc2UsXG4gICAgICAgIEZJTEVQQVRILkNPTkZJR19ESVIsXG4gICAgICAgIGVudixcbiAgICAgICAgcGF0aC5iYXNlbmFtZShGSUxFUEFUSC5MT0cpXG4gICAgICApO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMob3JpZ2luUGF0aCkpIHtcbiAgICAgICAgdGhpcy5sb2dDb25maWd1cmUob3JpZ2luUGF0aCk7XG4gICAgICB9IGVsc2UgaWYgKGZzLmV4aXN0c1N5bmMocHJlc2VudFBhdGgpKSB7XG4gICAgICAgIHRoaXMubG9nQ29uZmlndXJlKHByZXNlbnRQYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcihcImxvZ2dlciBmaWxlIHBhdGggY29uZmlndXJhdGlvbiBpcyBlcnJvci5cIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsb2FkTGlmZWN5Y2xlKCkge1xuICAgIGxldCBmaWxlUGF0aCA9IHBhdGguam9pbihcbiAgICAgIHRoaXMuYmFzZSxcbiAgICAgIEZJTEVQQVRILlNFUlZFUl9ESVIsXG4gICAgICB0aGlzLnNlcnZlclR5cGUsXG4gICAgICBGSUxFUEFUSC5MSUZFQ1lDTEVcbiAgICApO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGxpZmVjeWNsZSA9IHJlcXVpcmUoZmlsZVBhdGgpO1xuICAgIGZvciAobGV0IGtleSBpbiBsaWZlY3ljbGUpIHtcbiAgICAgIGlmICh0eXBlb2YgbGlmZWN5Y2xlW2tleV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aGlzLl9saWZlY3ljbGVDYnNba2V5XSA9IGxpZmVjeWNsZVtrZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oXCJsaWZlY3ljbGUuanMgaW4gJXMgaXMgZXJyb3IgZm9ybWF0LlwiLCBmaWxlUGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbG9nQ29uZmlndXJlKGZpbGVuYW1lOiBzdHJpbmcpIHtcbiAgICBMb2dnZXIuY29uZmlndXJlKGZpbGVuYW1lLCB7IHNlcnZlcklkOiB0aGlzLnNlcnZlcklkLCBiYXNlOiB0aGlzLmJhc2UgfSk7XG4gIH1cblxuICBkZWZhdWx0Q29uZmlndXJhdGlvbigpIHtcbiAgICBjb25zdCBhcmdzID0gcGFyc2VBcmdzKHByb2Nlc3MuYXJndik7XG4gICAgdGhpcy5zZXQoXG4gICAgICBSRVNFUlZFRC5FTlYsXG4gICAgICBhcmdzLmVudiB8fCBwcm9jZXNzLmVudi5OT0RFX0VOViB8fCBSRVNFUlZFRC5FTlZfREVWXG4gICAgKTtcbiAgICB0aGlzLmxvYWRDb25maWdCYXNlQXBwKFJFU0VSVkVELk1BU1RFUiwgRklMRVBBVEguTUFTVEVSKTtcbiAgICB0aGlzLmxvYWRTZXJ2ZXJzKCk7XG4gICAgdGhpcy5wcm9jZXNzQXJncyhhcmdzKTtcbiAgICB0aGlzLmNvbmZpZ0xvZ2dlcigpO1xuICAgIHRoaXMubG9hZExpZmVjeWNsZSgpO1xuICB9XG5cbiAgbG9hZENsdXN0ZXIoc2VydmVyOiBTZXJ2ZXJJbmZvLCBzZXJ2ZXJNYXA6IFNlcnZlckluZm9NYXApIHtcbiAgICBsZXQgaW5jcmVhc2VGaWVsZHM6IHsgW2lkeDogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcbiAgICBsZXQgaG9zdCA9IHNlcnZlci5ob3N0O1xuICAgIGxldCBjb3VudCA9IHBhcnNlSW50KHNlcnZlcltSRVNFUlZFRC5DTFVTVEVSX0NPVU5UXSk7XG4gICAgbGV0IHNlcSA9IHRoaXMuY2x1c3RlclNlcVtzZXJ2ZXIuc2VydmVyVHlwZV07XG4gICAgaWYgKCFzZXEpIHtcbiAgICAgIHNlcSA9IDA7XG4gICAgICB0aGlzLl9jbHVzdGVyU2VxW3NlcnZlci5zZXJ2ZXJUeXBlXSA9IGNvdW50O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jbHVzdGVyU2VxW3NlcnZlci5zZXJ2ZXJUeXBlXSA9IHNlcSArIGNvdW50O1xuICAgIH1cblxuICAgIGZvciAobGV0IGtleSBpbiBzZXJ2ZXIpIHtcbiAgICAgIGxldCB2YWx1ZSA9IHNlcnZlcltrZXldLnRvU3RyaW5nKCk7XG4gICAgICBpZiAodmFsdWUuaW5kZXhPZihSRVNFUlZFRC5DTFVTVEVSX1NJR05BTCkgPiAwKSB7XG4gICAgICAgIGxldCBiYXNlID0gc2VydmVyW2tleV0uc2xpY2UoMCwgLTIpO1xuICAgICAgICBpbmNyZWFzZUZpZWxkc1trZXldID0gYmFzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY2xvbmUgPSAoc3JjOiBhbnkpID0+IHtcbiAgICAgIGxldCBycyA9IHt9IGFzIGFueTtcbiAgICAgIGZvciAobGV0IGtleSBpbiBzcmMpIHtcbiAgICAgICAgcnNba2V5XSA9IHNyY1trZXldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJzO1xuICAgIH07XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBzZXE7IGkgPCBjb3VudDsgaSsrLCBsKyspIHtcbiAgICAgIGxldCBjc2VydmVyID0gY2xvbmUoc2VydmVyKTtcbiAgICAgIGNzZXJ2ZXIuaWQgPSBSRVNFUlZFRC5DTFVTVEVSX1BSRUZJWCArIHNlcnZlci5zZXJ2ZXJUeXBlICsgXCItXCIgKyBsO1xuICAgICAgZm9yIChsZXQgayBpbiBpbmNyZWFzZUZpZWxkcykge1xuICAgICAgICBsZXQgdiA9IHBhcnNlSW50KGluY3JlYXNlRmllbGRzW2tdKTtcbiAgICAgICAgY3NlcnZlcltrXSA9IHYgKyBpO1xuICAgICAgfVxuICAgICAgc2VydmVyTWFwW2NzZXJ2ZXIuaWRdID0gY3NlcnZlcjtcbiAgICB9XG4gIH1cblxuICBzdGFydEJ5VHlwZShjYj86IEZ1bmN0aW9uKSB7XG4gICAgaWYgKCEhdGhpcy5zdGFydElkKSB7XG4gICAgICBpZiAodGhpcy5zdGFydElkID09PSBSRVNFUlZFRC5NQVNURVIpIHtcbiAgICAgICAgaW52b2tlQ2FsbGJhY2soY2IhKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJ1blNlcnZlcnModGhpcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChcbiAgICAgICAgISF0aGlzLnR5cGUgJiZcbiAgICAgICAgdGhpcy50eXBlICE9PSBSRVNFUlZFRC5BTEwgJiZcbiAgICAgICAgdGhpcy50eXBlICE9PSBSRVNFUlZFRC5NQVNURVJcbiAgICAgICkge1xuICAgICAgICBydW5TZXJ2ZXJzKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW52b2tlQ2FsbGJhY2soY2IhKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBsb2FkRGVmYXVsdENvbXBvbmVudHMoKSB7XG4gICAgbGV0IHBvbWVsbyA9IHJlcXVpcmUoXCIuL3BvbWVsb1wiKS5kZWZhdWx0O1xuICAgIC8vIGxvYWQgc3lzdGVtIGRlZmF1bHQgY29tcG9uZW50c1xuICAgIGlmICh0aGlzLnNlcnZlclR5cGUgPT09IFJFU0VSVkVELk1BU1RFUikge1xuICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLm1hc3RlciwgdGhpcy5nZXQoXCJtYXN0ZXJDb25maWdcIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ucHJveHksIHRoaXMuZ2V0KFwicHJveHlDb25maWdcIikpO1xuICAgICAgaWYgKHRoaXMuY3VyU2VydmVyLnBvcnQpIHtcbiAgICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLnJlbW90ZSwgdGhpcy5nZXQoXCJyZW1vdGVDb25maWdcIikpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuaXNGcm9udGVuZCgpKSB7XG4gICAgICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5jb25uZWN0aW9uLCB0aGlzLmdldChcImNvbm5lY3Rpb25Db25maWdcIikpO1xuICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8uY29ubmVjdG9yLCB0aGlzLmdldChcImNvbm5lY3RvckNvbmZpZ1wiKSk7XG4gICAgICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5zZXNzaW9uLCB0aGlzLmdldChcInNlc3Npb25Db25maWdcIikpO1xuICAgICAgICAvLyBjb21wYXRpYmxlIGZvciBzY2hlZHVsZXJDb25maWdcbiAgICAgICAgaWYgKHRoaXMuZ2V0KFwic2NoZWR1bGVyQ29uZmlnXCIpKSB7XG4gICAgICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLnB1c2hTY2hlZHVsZXIsIHRoaXMuZ2V0KFwic2NoZWR1bGVyQ29uZmlnXCIpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ucHVzaFNjaGVkdWxlciwgdGhpcy5nZXQoXCJwdXNoU2NoZWR1bGVyQ29uZmlnXCIpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLmJhY2tlbmRTZXNzaW9uLCB0aGlzLmdldChcImJhY2tlbmRTZXNzaW9uQ29uZmlnXCIpKTtcbiAgICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5jaGFubmVsLCB0aGlzLmdldChcImNoYW5uZWxDb25maWdcIikpO1xuICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLnNlcnZlciwgdGhpcy5nZXQoXCJzZXJ2ZXJDb25maWdcIikpO1xuICAgIH1cbiAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ubW9uaXRvciwgdGhpcy5nZXQoXCJtb25pdG9yQ29uZmlnXCIpKTtcbiAgfVxuXG4gIHN0b3BDb21wcyhjb21wczogYW55W10sIGluZGV4OiBudW1iZXIsIGZvcmNlOiBib29sZWFuLCBjYj86IEZ1bmN0aW9uKSB7XG4gICAgaWYgKGluZGV4ID49IGNvbXBzLmxlbmd0aCkge1xuICAgICAgaW52b2tlQ2FsbGJhY2soY2IhKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGNvbXAgPSBjb21wc1tpbmRleF07XG4gICAgaWYgKHR5cGVvZiBjb21wLnN0b3AgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY29tcC5zdG9wKGZvcmNlLCAoKSA9PiB7XG4gICAgICAgIC8vIGlnbm9yZSBhbnkgZXJyb3JcbiAgICAgICAgdGhpcy5zdG9wQ29tcHMoY29tcHMsIGluZGV4ICsgMSwgZm9yY2UsIGNiKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0b3BDb21wcyhjb21wcywgaW5kZXggKyAxLCBmb3JjZSwgY2IpO1xuICAgIH1cbiAgfVxuXG4gIG9wdENvbXBvbmVudHMoY29tcHM6IGFueVtdLCBtZXRob2Q6IHN0cmluZywgY2I/OiBGdW5jdGlvbikge1xuICAgIC8qXG4gICAgYXN5bmMgZnVuY3Rpb24gY2FsbENvbXBNZXRob2QoY29tcDogYW55KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKGMsIGUpID0+IHtcbiAgICAgICAgY29tcFttZXRob2RdKGMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZvciAobGV0IGNvbXAgb2YgY29tcHMpIHtcbiAgICAgIGlmICh0eXBlb2YgY29tcFttZXRob2RdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgbGV0IGVycjogYW55ID0gYXdhaXQgY2FsbENvbXBNZXRob2QoY29tcCk7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGVyciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBcImZhaWwgdG8gb3BlcmF0ZSBjb21wb25lbnQsIG1ldGhvZDogJXMsIGVycjogJWpcIixcbiAgICAgICAgICAgICAgbWV0aG9kLFxuICAgICAgICAgICAgICBlcnJcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgXCJmYWlsIHRvIG9wZXJhdGUgY29tcG9uZW50LCBtZXRob2Q6ICVzLCBlcnI6ICVqXCIsXG4gICAgICAgICAgICAgIG1ldGhvZCxcbiAgICAgICAgICAgICAgZXJyLnN0YWNrXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpbnZva2VDYWxsYmFjayhjYiEsIGVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGludm9rZUNhbGxiYWNrKGNiISk7XG4gICAgKi9cbiAgICBsZXQgaSA9IDA7XG4gICAgYXN5bmMuZm9yRWFjaFNlcmllcyhcbiAgICAgIGNvbXBzLFxuICAgICAgKGNvbXA6IGFueSwgZG9uZTogYW55KSA9PiB7XG4gICAgICAgIGkrKztcbiAgICAgICAgaWYgKHR5cGVvZiBjb21wW21ldGhvZF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIGNvbXBbbWV0aG9kXShkb25lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGlmICh0eXBlb2YgZXJyID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIFwiZmFpbCB0byBvcGVyYXRlIGNvbXBvbmVudCwgbWV0aG9kOiAlcywgZXJyOiAlalwiLFxuICAgICAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgICAgIGVyclxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBcImZhaWwgdG8gb3BlcmF0ZSBjb21wb25lbnQsIG1ldGhvZDogJXMsIGVycjogJWpcIixcbiAgICAgICAgICAgICAgbWV0aG9kLFxuICAgICAgICAgICAgICBlcnIuc3RhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGludm9rZUNhbGxiYWNrKGNiISwgZXJyKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQXJncyhhcmdzOiBzdHJpbmdbXSkge1xuICBsZXQgYXJnc01hcDogQXJnc01hcCA9IHt9O1xuICBsZXQgbWFpblBvcyA9IDE7XG5cbiAgd2hpbGUgKGFyZ3NbbWFpblBvc10uaW5kZXhPZihcIi0tXCIpID4gMCkge1xuICAgIG1haW5Qb3MrKztcbiAgfVxuICBhcmdzTWFwLm1haW4gPSBhcmdzW21haW5Qb3NdO1xuXG4gIGZvciAobGV0IGkgPSBtYWluUG9zICsgMTsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgYXJnID0gYXJnc1tpXTtcbiAgICBsZXQgc2VwID0gYXJnLmluZGV4T2YoXCI9XCIpO1xuICAgIGxldCBrZXkgPSBhcmcuc2xpY2UoMCwgc2VwKTtcbiAgICBsZXQgdmFsdWU6IHN0cmluZyB8IG51bWJlciA9IGFyZy5zbGljZShzZXAgKyAxKTtcbiAgICBpZiAoIWlzTmFOKE51bWJlcih2YWx1ZSkpICYmIHZhbHVlLmluZGV4T2YoXCIuXCIpIDwgMCkge1xuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xuICAgIH1cbiAgICBhcmdzTWFwW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBhcmdzTWFwO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlU2VydmVyKHNsaXN0OiBTZXJ2ZXJJbmZvW10sIHNlcnZlckluZm86IFNlcnZlckluZm8pIHtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoc2xpc3RbaV0uaWQgPT09IHNlcnZlckluZm8uaWQpIHtcbiAgICAgIHNsaXN0W2ldID0gc2VydmVySW5mbztcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgc2xpc3QucHVzaChzZXJ2ZXJJbmZvKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU2VydmVyKHNsaXN0OiBTZXJ2ZXJJbmZvW10sIGlkOiBzdHJpbmcpIHtcbiAgaWYgKCFzbGlzdCB8fCAhc2xpc3QubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoc2xpc3RbaV0uaWQgPT09IGlkKSB7XG4gICAgICBzbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKHN0cjogc3RyaW5nLCBzZXR0aW5nczogc3RyaW5nKSB7XG4gIGlmICghc2V0dGluZ3MpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsZXQgdHMgPSBzZXR0aW5ncy5zcGxpdChcInxcIik7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHN0ciA9PT0gdHNbaV0pIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmludGVyZmFjZSBFdmVudENvbnN0cnVjdG9yPFQ+IHtcbiAgbmV3IChhcHA6IEFwcGxpY2F0aW9uKTogVDtcbn1cblxuZnVuY3Rpb24gYmluZEV2ZW50czxUPihFdmVudDogRXZlbnRDb25zdHJ1Y3RvcjxUPiwgYXBwOiBBcHBsaWNhdGlvbikge1xuICBsZXQgZW1ldGhvZHMgPSBuZXcgRXZlbnQoYXBwKTtcbiAgZm9yIChsZXQgbSBpbiBlbWV0aG9kcykge1xuICAgIGlmICh0eXBlb2YgZW1ldGhvZHNbbV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgYXBwLmV2ZW50Lm9uKG0sICg8YW55PmVtZXRob2RzW21dKS5iaW5kKGVtZXRob2RzKSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFkZEZpbHRlcihhcHA6IEFwcGxpY2F0aW9uLCB0eXBlOiBzdHJpbmcsIGZpbHRlcjogRmlsdGVyIHwgUlBDRmlsdGVyKSB7XG4gIGxldCBmaWx0ZXJzID0gYXBwLmdldCh0eXBlKTtcbiAgaWYgKCFmaWx0ZXJzKSB7XG4gICAgZmlsdGVycyA9IFtdO1xuICAgIGFwcC5zZXQodHlwZSwgZmlsdGVycyk7XG4gIH1cbiAgZmlsdGVycy5wdXNoKGZpbHRlcik7XG59XG5cbmV4cG9ydCB7IEFwcGxpY2F0aW9uIH07XG4iXX0=