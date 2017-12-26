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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbGljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcHBsaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFvQztBQUNwQyw2QkFBOEI7QUFDOUIseUJBQTBCO0FBQzFCLG1DQUFzQztBQUV0QyxxQ0FBa0M7QUFDbEMsd0NBQThDO0FBQzlDLDhDQUE4QztBQUc5QywwREFBMkQ7QUFDM0QsbUNBb0JpQjtBQUVqQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBRXhFLElBQUssS0FLSjtBQUxELFdBQUssS0FBSztJQUNSLGlEQUFnQixDQUFBO0lBQ2hCLCtDQUFlLENBQUE7SUFDZixtREFBaUIsQ0FBQTtJQUNqQixpREFBZ0IsQ0FBQSxDQUFDLGlCQUFpQjtBQUNwQyxDQUFDLEVBTEksS0FBSyxLQUFMLEtBQUssUUFLVDtBQXVJRDtJQU1FLElBQUksVUFBVTtRQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxXQUFXO1FBQ1QsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELElBQUksU0FBUztRQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFRLENB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QUMsRUFBRSxDQUFDLENBQUMsRUFBUSxRQUFRLENBQUMsQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDckQsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDO0FBRUQsbUJBQW1CLEdBQWdCLEVBQUUsSUFBWSxFQUFFLE1BQTBCO0lBQzNFLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2IsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgcHJvY2VzcyA9IHJlcXVpcmUoXCJwcm9jZXNzXCIpO1xyXG5pbXBvcnQgcGF0aCA9IHJlcXVpcmUoXCJwYXRoXCIpO1xyXG5pbXBvcnQgZnMgPSByZXF1aXJlKFwiZnNcIik7XHJcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gXCJldmVudHNcIjtcclxuaW1wb3J0IHsgU2Vzc2lvbiwgU2Vzc2lvblNlcnZpY2UgfSBmcm9tIFwiLi9jb21tb24vc2VydmljZS9zZXNzaW9uU2VydmljZVwiO1xyXG5pbXBvcnQgeyBldmVudHMgfSBmcm9tIFwiLi9wb21lbG9cIjtcclxuaW1wb3J0IHsgaW52b2tlQ2FsbGJhY2sgfSBmcm9tIFwiLi91dGlsL3V0aWxzXCI7XHJcbmltcG9ydCB7IHJ1blNlcnZlcnMgfSBmcm9tIFwiLi9tYXN0ZXIvc3RhcnRlclwiO1xyXG5pbXBvcnQgeyBDaGFubmVsU2VydmljZSB9IGZyb20gXCIuL2NvbW1vbi9zZXJ2aWNlL2NoYW5uZWxTZXJ2aWNlXCI7XHJcbmltcG9ydCB7IHdhdGNoIH0gZnJvbSBcImZzXCI7XHJcbmltcG9ydCBhcHBNYW5hZ2VyID0gcmVxdWlyZShcIi4vY29tbW9uL21hbmFnZXIvYXBwTWFuYWdlclwiKTtcclxuaW1wb3J0IHtcclxuICBCYWNrZW5kU2Vzc2lvblNlcnZpY2UsXHJcbiAgQ29ubmVjdGlvbkNvbXBvbmVudCxcclxuICBDb25uZWN0b3JDb21wb25lbnQsXHJcbiAgRGljdGlvbmFyeUNvbXBvbmVudCxcclxuICBNYXN0ZXJDb21wb25lbnQsXHJcbiAgTW9uaXRvckNvbXBvbmVudCxcclxuICBQcm90b2J1ZkNvbXBvbmVudCxcclxuICBQcm94eUNvbXBvbmVudCxcclxuICBQdXNoU2NoZWR1bGVyQ29tcG9uZW50LFxyXG4gIFJlbW90ZUNvbXBvbmVudCxcclxuICBTZXJ2ZXJDb21wb25lbnQsXHJcbiAgU2Vzc2lvbkNvbXBvbmVudCxcclxuICBGSUxFUEFUSCxcclxuICBLRVlXT1JEUyxcclxuICBSRVNFUlZFRCxcclxuICBMSUZFQ1lDTEUsXHJcbiAgRElSLFxyXG4gIFRJTUUsXHJcbiAgRnJvbnRlbmRTZXNzaW9uXHJcbn0gZnJvbSBcIi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgQmFja2VuZFNlc3Npb24gfSBmcm9tIFwiLi4vaW5kZXhcIjtcclxuY29uc3QgYXN5bmMgPSByZXF1aXJlKFwiYXN5bmNcIik7XHJcbmNvbnN0IExvZ2dlciA9IHJlcXVpcmUoXCJwb21lbG8tbG9nZ2VyXCIpO1xyXG5jb25zdCBsb2dnZXIgPSByZXF1aXJlKFwicG9tZWxvLWxvZ2dlclwiKS5nZXRMb2dnZXIoXCJwb21lbG9cIiwgX19maWxlbmFtZSk7XHJcblxyXG5lbnVtIFN0YXRlIHtcclxuICBTVEFURV9JTklURUQgPSAxLCAvLyBhcHAgaGFzIGluaXRlZFxyXG4gIFNUQVRFX1NUQVJUID0gMiwgLy8gYXBwIHN0YXJ0XHJcbiAgU1RBVEVfU1RBUlRFRCA9IDMsIC8vIGFwcCBoYXMgc3RhcnRlZFxyXG4gIFNUQVRFX1NUT1BFRCA9IDQgLy8gYXBwIGhhcyBzdG9wZWRcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJJbmZvIHtcclxuICBpZDogc3RyaW5nO1xyXG4gIGhvc3Q6IHN0cmluZztcclxuICBwb3J0OiBudW1iZXI7XHJcbiAgc2VydmVyVHlwZTogc3RyaW5nO1xyXG4gIGZyb250ZW5kPzogYm9vbGVhbiB8IHN0cmluZztcclxuICBjbGllbnRIb3N0Pzogc3RyaW5nO1xyXG4gIGNsaWVudFBvcnQ/OiBudW1iZXI7XHJcbiAgY3B1PzogbnVtYmVyO1xyXG4gIFtpZHg6IHN0cmluZ106IGFueTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb2R1bGUge1xyXG4gIG1vZHVsZUlkOiBzdHJpbmc7XHJcbiAgc3RhcnQoY2I/OiBGdW5jdGlvbik6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9kdWxlQ29uc3RydWN0b3Ige1xyXG4gICguLi5hcmdzOiBhbnlbXSk6IE1vZHVsZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb2R1bGVJbmZvIHtcclxuICBtb2R1bGVJZDogc3RyaW5nO1xyXG4gIG1vZHVsZTogTW9kdWxlIHwgTW9kdWxlQ29uc3RydWN0b3I7XHJcbiAgb3B0czogYW55O1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBNb2R1bGVJbmZvTWFwID0geyBbaWR4OiBzdHJpbmddOiBNb2R1bGVJbmZvIH07XHJcblxyXG5leHBvcnQgdHlwZSBTZXJ2ZXJJbmZvQXJyYXlNYXAgPSB7IFtpZHg6IHN0cmluZ106IFNlcnZlckluZm9bXSB9O1xyXG5leHBvcnQgdHlwZSBTZXJ2ZXJJbmZvTWFwID0geyBbaWR4OiBzdHJpbmddOiBTZXJ2ZXJJbmZvIH07XHJcbmV4cG9ydCB0eXBlIENsdXN0ZXJTZXFNYXAgPSB7IFtpZHg6IHN0cmluZ106IG51bWJlciB9O1xyXG5leHBvcnQgdHlwZSBMaWZlY3ljbGVDYnMgPSB7IFtpZHg6IHN0cmluZ106IEZ1bmN0aW9uIH07XHJcbmV4cG9ydCB0eXBlIFNldHRpbmdzID0geyBbaWR4OiBzdHJpbmddOiBhbnkgfTtcclxuZXhwb3J0IHR5cGUgQXJnc01hcCA9IHsgW2lkeDogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIH07XHJcbmV4cG9ydCB0eXBlIENhbGxiYWNrTWFwID0geyBbaWR4OiBzdHJpbmddOiAoY2I6IEZ1bmN0aW9uKSA9PiB2b2lkIH07XHJcbmV4cG9ydCB0eXBlIEZ1bmN0aW9uTWFwID0geyBbaWR4OiBzdHJpbmddOiBGdW5jdGlvbiB9O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSUENJbnZva2VGdW5jIHtcclxuICAoc2VydmVySWQ6IHN0cmluZywgbXNnOiBhbnksIGNiPzogRnVuY3Rpb24pOiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBCZWZvcmVGaWx0ZXJGdW5jID0gKFxyXG4gIG1zZzogYW55LFxyXG4gIHNlc3Npb246IEZyb250ZW5kU2Vzc2lvbixcclxuICBuZXh0OiBGdW5jdGlvblxyXG4pID0+IHZvaWQ7XHJcbmV4cG9ydCB0eXBlIEFmdGVyRmlsdGVyRnVuYyA9IChcclxuICBlcnI6IGFueSxcclxuICBtc2c6IGFueSxcclxuICBzZXNzaW9uOiBGcm9udGVuZFNlc3Npb24sXHJcbiAgcmVzcDogYW55LFxyXG4gIG5leHQ6IEZ1bmN0aW9uXHJcbikgPT4gdm9pZDtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsdGVyIHtcclxuICBiZWZvcmUobXNnOiBhbnksIHNlc3Npb246IEZyb250ZW5kU2Vzc2lvbiwgbmV4dDogRnVuY3Rpb24pOiB2b2lkO1xyXG4gIGFmdGVyKGVycjogYW55LCBtc2c6IGFueSwgc2Vzc2lvbjogRnJvbnRlbmRTZXNzaW9uLCByZXNwOiBhbnksIG5leHQ6IEZ1bmN0aW9uKTogdm9pZDtcclxufVxyXG5leHBvcnQgaW50ZXJmYWNlIFJQQ0ZpbHRlciB7XHJcbiAgYmVmb3JlKHNlcnZlcklkOiBzdHJpbmcsIG1zZzogYW55LCBvcHRzOiBhbnksIG5leHQ6IEZ1bmN0aW9uKTogdm9pZDtcclxuICBhZnRlcihzZXJ2ZXJJZDogc3RyaW5nLCBtc2c6IGFueSwgb3B0czogYW55LCBuZXh0OiBGdW5jdGlvbik6IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JvbiB7XHJcbiAgaWQ6IG51bWJlcjtcclxuICB0aW1lOiBzdHJpbmc7XHJcbiAgYWN0aW9uOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50IHtcclxuICByZWFkb25seSBuYW1lOiBzdHJpbmc7XHJcbiAgcmVhZG9ubHkgYXBwPzogQXBwbGljYXRpb247XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2NoZWR1bGVyIHtcclxuICBzdGFydD8oY2I/OiBGdW5jdGlvbik6IHZvaWQ7XHJcbiAgc3RvcD8oY2I/OiBGdW5jdGlvbik6IHZvaWQ7XHJcbiAgc2NoZWR1bGUoXHJcbiAgICByZXFJZDogbnVtYmVyLFxyXG4gICAgcm91dGU6IHN0cmluZyxcclxuICAgIG1zZzogYW55LFxyXG4gICAgcmVjdnM6IG51bWJlcltdLFxyXG4gICAgb3B0czogYW55LFxyXG4gICAgY2I/OiBGdW5jdGlvblxyXG4gICk6IHZvaWQ7XHJcbn1cclxuZXhwb3J0IGludGVyZmFjZSBTY2hlZHVsZXJDb25zdHJ1Y3RvciB7XHJcbiAgKC4uLmFyZ3M6IGFueVtdKTogU2NoZWR1bGVyO1xyXG59XHJcblxyXG5leHBvcnQgdHlwZSBTY2hlZHVsZXJNYXAgPSB7IFtpZHg6IHN0cmluZ106IFNjaGVkdWxlciB9O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xyXG4gIC8vbmV3IChwb3J0OiBudW1iZXIsIGhvc3Q6IHN0cmluZywgb3B0cz86YW55KTogVDtcclxuICBzdGFydChjYjogRnVuY3Rpb24pOiB2b2lkO1xyXG4gIHN0b3AoZm9yY2U6IGJvb2xlYW4sIGNiOiBGdW5jdGlvbik6IHZvaWQ7XHJcbiAgY2xvc2U/KCk6IHZvaWQ7XHJcbiAgZW5jb2RlKHJlcUlkOiBudW1iZXIsIHJvdXRlOiBzdHJpbmcsIG1zZzogYW55LCBjYj86IEZ1bmN0aW9uKTogYW55O1xyXG4gIGRlY29kZShtc2c6IGFueSwgc2Vzc2lvbjogU2Vzc2lvbiwgY2I/OiBGdW5jdGlvbik6IGFueTtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQ29ubmVjdG9yRW5jb2RlRnVuYyA9IChcclxuICByZXFJZDogbnVtYmVyLFxyXG4gIHJvdXRlOiBzdHJpbmcsXHJcbiAgbXNnOiBhbnksXHJcbiAgY2I/OiBGdW5jdGlvblxyXG4pID0+IGFueTtcclxuZXhwb3J0IHR5cGUgQ29ubmVjdG9yRGVjb2RlRnVuYyA9IChcclxuICBtc2c6IGFueSxcclxuICBzZXNzaW9uOiBTZXNzaW9uLFxyXG4gIGNiPzogRnVuY3Rpb25cclxuKSA9PiBhbnk7XHJcbmV4cG9ydCB0eXBlIEJsYWNrbGlzdCA9IChSZWdFeHAgfCBzdHJpbmcpW107XHJcbmV4cG9ydCB0eXBlIEJsYWNrbGlzdEZ1bmMgPSAoY2I6IChlcnI6IGFueSwgbGlzdDogQmxhY2tsaXN0KSA9PiB2b2lkKSA9PiB2b2lkO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBcHBDb21wb25lbnRzIHtcclxuICBfX2JhY2tlbmRTZXNzaW9uX186IEJhY2tlbmRTZXNzaW9uU2VydmljZTtcclxuICBfX2NoYW5uZWxfXzogQ2hhbm5lbFNlcnZpY2U7XHJcbiAgX19jb25uZWN0aW9uX186IENvbm5lY3Rpb25Db21wb25lbnQ7XHJcbiAgX19jb25uZWN0b3JfXzogQ29ubmVjdG9yQ29tcG9uZW50O1xyXG4gIF9fZGljdGlvbmFyeV9fOiBEaWN0aW9uYXJ5Q29tcG9uZW50O1xyXG4gIF9fbWFzdGVyX186IE1hc3RlckNvbXBvbmVudDtcclxuICBfX21vbml0b3JfXzogTW9uaXRvckNvbXBvbmVudDtcclxuICBfX3Byb3RvYnVmX186IFByb3RvYnVmQ29tcG9uZW50O1xyXG4gIF9fcHJveHlfXzogUHJveHlDb21wb25lbnQ7XHJcbiAgX19wdXNoU2NoZWR1bGVyX186IFB1c2hTY2hlZHVsZXJDb21wb25lbnQ7XHJcbiAgX19yZW1vdGVfXzogUmVtb3RlQ29tcG9uZW50O1xyXG4gIF9fc2VydmVyX186IFNlcnZlckNvbXBvbmVudDtcclxuICBfX3Nlc3Npb25fXzogU2Vzc2lvbkNvbXBvbmVudDtcclxuICBbaWR4OiBzdHJpbmddOiBDb21wb25lbnQ7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEFwcGxpY2F0aW9uIHtcclxuICByZWFkb25seSBldmVudDogRXZlbnRFbWl0dGVyO1xyXG4gIHN5c3JwYzogYW55OyAvL1RPRE86cG9tZWxvLXJwY1xyXG5cclxuICBwcml2YXRlIF9jb21wb25lbnRzOiBBcHBDb21wb25lbnRzO1xyXG4gIHByaXZhdGUgX3N0b3BUaW1lcjogYW55O1xyXG4gIGdldCBjb21wb25lbnRzKCk6IFJlYWRvbmx5PEFwcENvbXBvbmVudHM+IHtcclxuICAgIHJldHVybiB0aGlzLl9jb21wb25lbnRzO1xyXG4gIH1cclxuXHJcbiAgZ2V0IHNlcnZlcklkKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuU0VSVkVSX0lEKTtcclxuICB9XHJcblxyXG4gIGdldFNlcnZlcklkKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2VydmVySWQ7XHJcbiAgfVxyXG5cclxuICBnZXQgc2VydmVyVHlwZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELlNFUlZFUl9UWVBFKTtcclxuICB9XHJcblxyXG4gIGdldCBjdXJTZXJ2ZXIoKTogU2VydmVySW5mbyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuQ1VSUkVOVF9TRVJWRVIpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfc3RhcnRUaW1lOiBudW1iZXI7XHJcbiAgZ2V0IHN0YXJ0VGltZSgpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHRoaXMuX3N0YXJ0VGltZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX3NlcnZlcnM6IFNlcnZlckluZm9NYXA7XHJcbiAgZ2V0IHNlcnZlcnMoKTogUmVhZG9ubHk8U2VydmVySW5mb01hcD4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX3NlcnZlcnM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9zZXJ2ZXJUeXBlTWFwczogU2VydmVySW5mb0FycmF5TWFwO1xyXG4gIGdldCBzZXJ2ZXJUeXBlTWFwcygpOiBSZWFkb25seTxTZXJ2ZXJJbmZvQXJyYXlNYXA+IHtcclxuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXJUeXBlTWFwcztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX3NlcnZlclR5cGVzOiBzdHJpbmdbXTtcclxuICBnZXQgc2VydmVyVHlwZXMoKTogUmVhZG9ubHk8c3RyaW5nW10+IHtcclxuICAgIHJldHVybiB0aGlzLl9zZXJ2ZXJUeXBlcztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2xpZmVjeWNsZUNiczogTGlmZWN5Y2xlQ2JzO1xyXG4gIGdldCBsaWZlY3ljbGVDYnMoKTogUmVhZG9ubHk8TGlmZWN5Y2xlQ2JzPiB7XHJcbiAgICByZXR1cm4gdGhpcy5fbGlmZWN5Y2xlQ2JzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfY2x1c3RlclNlcTogQ2x1c3RlclNlcU1hcDtcclxuICBnZXQgY2x1c3RlclNlcSgpOiBSZWFkb25seTxDbHVzdGVyU2VxTWFwPiB7XHJcbiAgICByZXR1cm4gdGhpcy5fY2x1c3RlclNlcTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX3NldHRpbmdzOiBTZXR0aW5ncztcclxuICBnZXQgc2V0dGluZ3MoKTogUmVhZG9ubHk8U2V0dGluZ3M+IHtcclxuICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcclxuICB9XHJcblxyXG4gIGdldCBtYXN0ZXIoKTogU2VydmVySW5mbyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuTUFTVEVSKTtcclxuICB9XHJcblxyXG4gIGdldCBiYXNlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuQkFTRSk7XHJcbiAgfVxyXG5cclxuICBnZXQgZW52KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuRU5WKTtcclxuICB9XHJcblxyXG4gIGdldCBtYWluKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuTUFJTik7XHJcbiAgfVxyXG5cclxuICBnZXQgbW9kZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMuZ2V0KFJFU0VSVkVELk1PREUpO1xyXG4gIH1cclxuXHJcbiAgZ2V0IHR5cGUoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLmdldChSRVNFUlZFRC5UWVBFKTtcclxuICB9XHJcblxyXG4gIGdldCBzdGFydElkKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoUkVTRVJWRUQuU1RBUlRJRCk7XHJcbiAgfVxyXG5cclxuICBnZXQgc2VydmVyc0Zyb21Db25maWcoKTogU2VydmVySW5mb01hcCB7XHJcbiAgICByZXR1cm4gdGhpcy5nZXQoS0VZV09SRFMuU0VSVkVSX01BUCk7XHJcbiAgfVxyXG5cclxuICBnZXRTZXJ2ZXJzRnJvbUNvbmZpZygpIHtcclxuICAgIHJldHVybiB0aGlzLnNlcnZlcnNGcm9tQ29uZmlnO1xyXG4gIH1cclxuXHJcbiAgZ2V0IGJhY2tlbmRTZXNzaW9uU2VydmljZSgpIHtcclxuICAgIHJldHVybiB0aGlzLmdldChcImJhY2tlbmRTZXNzaW9uU2VydmljZVwiKTtcclxuICB9XHJcblxyXG4gIGdldCBjaGFubmVsU2VydmljZSgpIHtcclxuICAgIHJldHVybiB0aGlzLmdldChcImNoYW5uZWxTZXJ2aWNlXCIpO1xyXG4gIH1cclxuXHJcbiAgZ2V0IHJwY0ludm9rZSgpIHtcclxuICAgIHJldHVybiB0aGlzLmdldChcInJwY0ludm9rZVwiKTsgLy9UT0RPXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHN0YXRpYyBfaW5zdGFuY2U6IEFwcGxpY2F0aW9uO1xyXG4gIHN0YXRpYyBnZXQgaW5zdGFuY2UoKTogQXBwbGljYXRpb24ge1xyXG4gICAgaWYgKCFBcHBsaWNhdGlvbi5faW5zdGFuY2UpIHtcclxuICAgICAgQXBwbGljYXRpb24uX2luc3RhbmNlID0gbmV3IEFwcGxpY2F0aW9uKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gQXBwbGljYXRpb24uX2luc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfbG9hZGVkOiBhbnlbXTtcclxuICBwcml2YXRlIF9zdGF0ZTogU3RhdGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5ldmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcclxuICAgIHRoaXMuX2xvYWRlZCA9IFtdO1xyXG4gICAgdGhpcy5fY29tcG9uZW50cyA9IHt9IGFzIEFwcENvbXBvbmVudHM7XHJcbiAgICB0aGlzLl9zZXR0aW5ncyA9IHt9O1xyXG4gICAgdGhpcy5fc2VydmVycyA9IHt9O1xyXG4gICAgdGhpcy5fc2VydmVyVHlwZU1hcHMgPSB7fTtcclxuICAgIHRoaXMuX3NlcnZlclR5cGVzID0gW107XHJcbiAgICB0aGlzLl9saWZlY3ljbGVDYnMgPSB7fTtcclxuICAgIHRoaXMuX2NsdXN0ZXJTZXEgPSB7fTtcclxuICB9XHJcblxyXG4gIGluaXQob3B0cz86IGFueSkge1xyXG4gICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICBsZXQgYmFzZSA9IG9wdHMuYmFzZSB8fCBwYXRoLmRpcm5hbWUocmVxdWlyZS5tYWluIS5maWxlbmFtZSk7XHJcbiAgICB0aGlzLnNldChSRVNFUlZFRC5CQVNFLCBiYXNlKTtcclxuICAgIHRoaXMuZGVmYXVsdENvbmZpZ3VyYXRpb24oKTtcclxuICAgIHRoaXMuX3N0YXRlID0gU3RhdGUuU1RBVEVfSU5JVEVEO1xyXG4gICAgbG9nZ2VyLmluZm8oXCJhcHBsaWNhdGlvbiBpbml0ZWQ6ICVqXCIsIHRoaXMuc2VydmVySWQpO1xyXG4gIH1cclxuXHJcbiAgcmVxdWlyZShwaDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gcmVxdWlyZShwYXRoLmpvaW4odGhpcy5iYXNlLCBwaCkpO1xyXG4gIH1cclxuXHJcbiAgY29uZmlndXJlTG9nZ2VyKGxvZ2dlcjogYW55KSB7XHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuUE9NRUxPX0xPR0dFUiAhPT0gXCJvZmZcIikge1xyXG4gICAgICBsZXQgYmFzZSA9IHRoaXMuYmFzZTtcclxuICAgICAgbGV0IGVudiA9IHRoaXMuZ2V0KFJFU0VSVkVELkVOVik7XHJcbiAgICAgIGxldCBvcmlnaW5QYXRoID0gcGF0aC5qb2luKGJhc2UsIEZJTEVQQVRILkxPRyk7XHJcbiAgICAgIGxldCBwcmVzZW50UGF0aCA9IHBhdGguam9pbihcclxuICAgICAgICBiYXNlLFxyXG4gICAgICAgIEZJTEVQQVRILkNPTkZJR19ESVIsXHJcbiAgICAgICAgZW52LFxyXG4gICAgICAgIHBhdGguYmFzZW5hbWUoRklMRVBBVEguTE9HKVxyXG4gICAgICApO1xyXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhvcmlnaW5QYXRoKSkge1xyXG4gICAgICAgIGxvZ2dlci5jb25maWd1cmUob3JpZ2luUGF0aCwgeyBzZXJ2ZXJJZDogdGhpcy5zZXJ2ZXJJZCwgYmFzZTogYmFzZSB9KTtcclxuICAgICAgfSBlbHNlIGlmIChmcy5leGlzdHNTeW5jKHByZXNlbnRQYXRoKSkge1xyXG4gICAgICAgIGxvZ2dlci5jb25maWd1cmUocHJlc2VudFBhdGgsIHsgc2VydmVySWQ6IHRoaXMuc2VydmVySWQsIGJhc2U6IGJhc2UgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKFwibG9nZ2VyIGZpbGUgcGF0aCBjb25maWd1cmF0aW9uIGlzIGVycm9yLlwiKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZmlsdGVyKGZpbHRlcjogRmlsdGVyKSB7XHJcbiAgICB0aGlzLmJlZm9yZShmaWx0ZXIpO1xyXG4gICAgdGhpcy5hZnRlcihmaWx0ZXIpO1xyXG4gIH1cclxuXHJcbiAgYmVmb3JlKGJmOiBGaWx0ZXIpIHtcclxuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5CRUZPUkVfRklMVEVSLCBiZik7XHJcbiAgfVxyXG5cclxuICBhZnRlcihhZjogRmlsdGVyKSB7XHJcbiAgICBhZGRGaWx0ZXIodGhpcywgS0VZV09SRFMuQUZURVJfRklMVEVSLCBhZik7XHJcbiAgfVxyXG5cclxuICBnbG9iYWxGaWx0ZXIoZmlsdGVyOiBGaWx0ZXIpIHtcclxuICAgIHRoaXMuZ2xvYmFsQmVmb3JlKGZpbHRlcik7XHJcbiAgICB0aGlzLmdsb2JhbEFmdGVyKGZpbHRlcik7XHJcbiAgfVxyXG5cclxuICBnbG9iYWxCZWZvcmUoYmY6IEZpbHRlcikge1xyXG4gICAgYWRkRmlsdGVyKHRoaXMsIEtFWVdPUkRTLkdMT0JBTF9CRUZPUkVfRklMVEVSLCBiZik7XHJcbiAgfVxyXG5cclxuICBnbG9iYWxBZnRlcihhZjogRmlsdGVyKSB7XHJcbiAgICBhZGRGaWx0ZXIodGhpcywgS0VZV09SRFMuR0xPQkFMX0FGVEVSX0ZJTFRFUiwgYWYpO1xyXG4gIH1cclxuXHJcbiAgcnBjQmVmb3JlKGJmOiBSUENGaWx0ZXIpIHtcclxuICAgIGFkZEZpbHRlcih0aGlzLCBLRVlXT1JEUy5SUENfQkVGT1JFX0ZJTFRFUiwgYmYpO1xyXG4gIH1cclxuXHJcbiAgcnBjQWZ0ZXIoYWY6IFJQQ0ZpbHRlcikge1xyXG4gICAgYWRkRmlsdGVyKHRoaXMsIEtFWVdPUkRTLlJQQ19BRlRFUl9GSUxURVIsIGFmKTtcclxuICB9XHJcblxyXG4gIHJwY0ZpbHRlcihmaWx0ZXI6IFJQQ0ZpbHRlcikge1xyXG4gICAgdGhpcy5ycGNCZWZvcmUoZmlsdGVyKTtcclxuICAgIHRoaXMucnBjQWZ0ZXIoZmlsdGVyKTtcclxuICB9XHJcblxyXG4gIGxvYWQoY29tcG9uZW50OiBDb21wb25lbnQgfCBGdW5jdGlvbiwgb3B0cz86IHt9KSB7XHJcbiAgICBsZXQgbmFtZTogc3RyaW5nID0gPGFueT5udWxsO1xyXG4gICAgaWYgKHR5cGVvZiBjb21wb25lbnQgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICBjb21wb25lbnQgPSBjb21wb25lbnQodGhpcywgb3B0cyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFuYW1lICYmIHR5cGVvZiBjb21wb25lbnQubmFtZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICBuYW1lID0gY29tcG9uZW50Lm5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5hbWUgJiYgdGhpcy5jb21wb25lbnRzW25hbWVdKSB7XHJcbiAgICAgIC8vIGlnbm9yZSBkdXBsaWNhdCBjb21wb25lbnRcclxuICAgICAgbG9nZ2VyLndhcm4oXCJpZ25vcmUgZHVwbGljYXRlIGNvbXBvbmVudDogJWpcIiwgbmFtZSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9sb2FkZWQucHVzaChjb21wb25lbnQpO1xyXG4gICAgaWYgKG5hbWUpIHtcclxuICAgICAgLy8gY29tcG9uZW50cyB3aXRoIGEgbmFtZSB3b3VsZCBnZXQgYnkgbmFtZSB0aHJvdWdodCBhcHAuY29tcG9uZW50cyBsYXRlci5cclxuICAgICAgdGhpcy5fY29tcG9uZW50c1tuYW1lXSA9IGNvbXBvbmVudDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGxvYWRDb25maWdCYXNlQXBwKGtleTogc3RyaW5nLCB2YWw6IHN0cmluZywgcmVsb2FkOiBib29sZWFuID0gZmFsc2UpIHtcclxuICAgIGxldCBlbnYgPSB0aGlzLmdldChSRVNFUlZFRC5FTlYpO1xyXG4gICAgbGV0IG9yaWdpblBhdGggPSBwYXRoLmpvaW4odGhpcy5iYXNlLCB2YWwpO1xyXG4gICAgbGV0IHByZXNlbnRQYXRoID0gcGF0aC5qb2luKFxyXG4gICAgICB0aGlzLmJhc2UsXHJcbiAgICAgIEZJTEVQQVRILkNPTkZJR19ESVIsXHJcbiAgICAgIGVudixcclxuICAgICAgcGF0aC5iYXNlbmFtZSh2YWwpXHJcbiAgICApO1xyXG4gICAgbGV0IHJlYWxQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhvcmlnaW5QYXRoKSkge1xyXG4gICAgICByZWFsUGF0aCA9IG9yaWdpblBhdGg7XHJcbiAgICAgIGxldCBmaWxlID0gcmVxdWlyZShvcmlnaW5QYXRoKTtcclxuICAgICAgaWYgKGZpbGVbZW52XSkge1xyXG4gICAgICAgIGZpbGUgPSBmaWxlW2Vudl07XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5zZXQoa2V5LCBmaWxlKTtcclxuICAgIH0gZWxzZSBpZiAoZnMuZXhpc3RzU3luYyhwcmVzZW50UGF0aCkpIHtcclxuICAgICAgcmVhbFBhdGggPSBwcmVzZW50UGF0aDtcclxuICAgICAgbGV0IHBmaWxlID0gcmVxdWlyZShwcmVzZW50UGF0aCk7XHJcbiAgICAgIHRoaXMuc2V0KGtleSwgcGZpbGUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKFwiaW52YWxpZCBjb25maWd1cmF0aW9uIHdpdGggZmlsZSBwYXRoOiAlc1wiLCBrZXkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghIXJlYWxQYXRoICYmICEhcmVsb2FkKSB7XHJcbiAgICAgIGZzLndhdGNoKHJlYWxQYXRoLCAoZXZlbnQsIGZpbGVuYW1lKSA9PiB7XHJcbiAgICAgICAgaWYgKGV2ZW50ID09PSBcImNoYW5nZVwiKSB7XHJcbiAgICAgICAgICBkZWxldGUgcmVxdWlyZS5jYWNoZVtyZXF1aXJlLnJlc29sdmUocmVhbFBhdGghKV07XHJcbiAgICAgICAgICB0aGlzLmxvYWRDb25maWdCYXNlQXBwKGtleSwgdmFsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbG9hZENvbmZpZyhrZXk6IHN0cmluZywgdmFsOiBzdHJpbmcpIHtcclxuICAgIGxldCBlbnYgPSB0aGlzLmdldChSRVNFUlZFRC5FTlYpO1xyXG4gICAgbGV0IG1vZCA9IHJlcXVpcmUodmFsKTtcclxuICAgIGlmIChtb2RbZW52XSkge1xyXG4gICAgICBtb2QgPSBtb2RbZW52XTtcclxuICAgIH1cclxuICAgIHRoaXMuc2V0KGtleSwgbW9kKTtcclxuICB9XHJcblxyXG4gIHJvdXRlKHNlcnZlclR5cGU6IHN0cmluZywgcm91dGVGdW5jOiBGdW5jdGlvbikge1xyXG4gICAgbGV0IHJvdXRlcyA9IHRoaXMuZ2V0KEtFWVdPUkRTLlJPVVRFKTtcclxuICAgIGlmICghcm91dGVzKSB7XHJcbiAgICAgIHJvdXRlcyA9IHt9O1xyXG4gICAgICB0aGlzLnNldChLRVlXT1JEUy5ST1VURSwgcm91dGVzKTtcclxuICAgIH1cclxuICAgIHJvdXRlc1tzZXJ2ZXJUeXBlXSA9IHJvdXRlRnVuYztcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgc3RhcnQoY2I/OiBGdW5jdGlvbikge1xyXG4gICAgdGhpcy5fc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSA+IFN0YXRlLlNUQVRFX0lOSVRFRCkge1xyXG4gICAgICBpbnZva2VDYWxsYmFjayhjYiEsIG5ldyBFcnJvcihcImFwcGxpY2F0aW9uIGhhcyBhbHJlYWR5IHN0YXJ0LlwiKSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnN0YXJ0QnlUeXBlKCgpID0+IHtcclxuICAgICAgdGhpcy5sb2FkRGVmYXVsdENvbXBvbmVudHMoKTtcclxuICAgICAgbGV0IHN0YXJ0VXAgPSAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5vcHRDb21wb25lbnRzKHRoaXMuX2xvYWRlZCwgUkVTRVJWRUQuU1RBUlQsIChlcnI6IGFueSkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5fc3RhdGUgPSBTdGF0ZS5TVEFURV9TVEFSVDtcclxuICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgaW52b2tlQ2FsbGJhY2soY2IhLCBlcnIpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oXCIlaiBlbnRlciBhZnRlciBzdGFydC4uLlwiLCB0aGlzLnNlcnZlcklkKTtcclxuICAgICAgICAgICAgdGhpcy5hZnRlclN0YXJ0KGNiISk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH07XHJcbiAgICAgIGxldCBiZWZvcmVGdW4gPSB0aGlzLmxpZmVjeWNsZUNic1tMSUZFQ1lDTEUuQkVGT1JFX1NUQVJUVVBdO1xyXG4gICAgICBpZiAoISFiZWZvcmVGdW4pIHtcclxuICAgICAgICBiZWZvcmVGdW4uY2FsbChudWxsLCB0aGlzLCBzdGFydFVwKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBzdGFydFVwKCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYWZ0ZXJTdGFydChjYjogRnVuY3Rpb24pIHtcclxuICAgIGlmICh0aGlzLl9zdGF0ZSAhPT0gU3RhdGUuU1RBVEVfU1RBUlQpIHtcclxuICAgICAgaW52b2tlQ2FsbGJhY2soY2IsIG5ldyBFcnJvcihcImFwcGxpY2F0aW9uIGlzIG5vdCBydW5uaW5nIG5vdy5cIikpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGFmdGVyRnVuID0gdGhpcy5saWZlY3ljbGVDYnNbTElGRUNZQ0xFLkFGVEVSX1NUQVJUVVBdO1xyXG4gICAgdGhpcy5vcHRDb21wb25lbnRzKHRoaXMuX2xvYWRlZCwgUkVTRVJWRUQuQUZURVJfU1RBUlQsIChlcnI6IGFueSkgPT4ge1xyXG4gICAgICB0aGlzLl9zdGF0ZSA9IFN0YXRlLlNUQVRFX1NUQVJURUQ7XHJcbiAgICAgIGxldCBpZCA9IHRoaXMuc2VydmVySWQ7XHJcbiAgICAgIGlmICghZXJyKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oXCIlaiBmaW5pc2ggc3RhcnRcIiwgaWQpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICghIWFmdGVyRnVuKSB7XHJcbiAgICAgICAgYWZ0ZXJGdW4uY2FsbChudWxsLCB0aGlzLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGludm9rZUNhbGxiYWNrKGNiLCBlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGludm9rZUNhbGxiYWNrKGNiLCBlcnIpO1xyXG4gICAgICB9XHJcbiAgICAgIGxldCB1c2VkVGltZSA9IERhdGUubm93KCkgLSB0aGlzLnN0YXJ0VGltZTtcclxuICAgICAgbG9nZ2VyLmluZm8oXCIlaiBzdGFydHVwIGluICVzIG1zXCIsIGlkLCB1c2VkVGltZSk7XHJcbiAgICAgIHRoaXMuZXZlbnQuZW1pdChldmVudHMuU1RBUlRfU0VSVkVSLCBpZCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHN0b3AoZm9yY2U/OiBib29sZWFuKSB7XHJcbiAgICBpZiAodGhpcy5fc3RhdGUgPiBTdGF0ZS5TVEFURV9TVEFSVEVEKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKFwiW3BvbWVsbyBhcHBsaWNhdGlvbl0gYXBwbGljYXRpb24gaXMgbm90IHJ1bm5pbmcgbm93LlwiKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fc3RhdGUgPSBTdGF0ZS5TVEFURV9TVE9QRUQ7XHJcbiAgICBsZXQgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdGhpcy5fc3RvcFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcclxuICAgIH0sIFRJTUUuVElNRV9XQUlUX1NUT1ApO1xyXG5cclxuICAgIGxldCBjYW5jZWxTaHV0RG93blRpbWVyID0gKCkgPT4ge1xyXG4gICAgICBpZiAoISFzZWxmLl9zdG9wVGltZXIpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQoc2VsZi5fc3RvcFRpbWVyKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIGxldCBzaHV0RG93biA9ICgpID0+IHtcclxuICAgICAgdGhpcy5zdG9wQ29tcHMoc2VsZi5fbG9hZGVkLCAwLCBmb3JjZSEsICgpID0+IHtcclxuICAgICAgICBjYW5jZWxTaHV0RG93blRpbWVyKCk7XHJcbiAgICAgICAgaWYgKGZvcmNlKSB7XHJcbiAgICAgICAgICBwcm9jZXNzLmV4aXQoMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH07XHJcbiAgICBsZXQgZnVuID0gdGhpcy5nZXQoS0VZV09SRFMuQkVGT1JFX1NUT1BfSE9PSyk7XHJcbiAgICBsZXQgc3RvcEZ1biA9IHRoaXMubGlmZWN5Y2xlQ2JzW0xJRkVDWUNMRS5CRUZPUkVfU0hVVERPV05dO1xyXG4gICAgaWYgKCEhc3RvcEZ1bikge1xyXG4gICAgICBzdG9wRnVuLmNhbGwobnVsbCwgdGhpcywgc2h1dERvd24sIGNhbmNlbFNodXREb3duVGltZXIpO1xyXG4gICAgfSBlbHNlIGlmICghIWZ1bikge1xyXG4gICAgICBpbnZva2VDYWxsYmFjayhmdW4sIHNlbGYsIHNodXREb3duLCBjYW5jZWxTaHV0RG93blRpbWVyKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNodXREb3duKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzZXQoc2V0dGluZzogc3RyaW5nLCB2YWw6IGFueSkge1xyXG4gICAgdGhpcy5fc2V0dGluZ3Nbc2V0dGluZ10gPSB2YWw7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGdldChrZXk6IFwicnBjSW52b2tlXCIpOiBSUENJbnZva2VGdW5jO1xyXG4gIGdldChrZXk6IFwibWFzdGVyXCIpOiBTZXJ2ZXJJbmZvO1xyXG4gIGdldChrZXk6IFwiYmFzZVwiKTogc3RyaW5nO1xyXG4gIGdldChrZXk6IFwiZW52XCIpOiBzdHJpbmc7XHJcbiAgZ2V0KGtleTogXCJtYWluXCIpOiBzdHJpbmc7XHJcbiAgZ2V0KGtleTogXCJtb2RlXCIpOiBzdHJpbmc7XHJcbiAgZ2V0KGtleTogXCJ0eXBlXCIpOiBzdHJpbmc7XHJcbiAgZ2V0KGtleTogXCJzZXJ2ZXJUeXBlXCIpOiBzdHJpbmc7XHJcbiAgZ2V0KGtleTogXCJzZXJ2ZXJJZFwiKTogc3RyaW5nO1xyXG4gIGdldChrZXk6IFwic3RhcnRJZFwiKTogc3RyaW5nO1xyXG4gIGdldChrZXk6IFwic2VydmVyc1wiKTogU2VydmVySW5mb0FycmF5TWFwO1xyXG4gIGdldChrZXk6IFwiY2hhbm5lbFNlcnZpY2VcIik6IENoYW5uZWxTZXJ2aWNlO1xyXG4gIGdldChrZXk6IFwiYmFja2VuZFNlc3Npb25TZXJ2aWNlXCIpOiBCYWNrZW5kU2Vzc2lvblNlcnZpY2U7XHJcbiAgZ2V0KGtleTogXCJfX21vZHVsZXNfX1wiKTogTW9kdWxlSW5mb01hcDtcclxuICBnZXQoa2V5OiBcInNlc3Npb25TZXJ2aWNlXCIpOiBTZXNzaW9uU2VydmljZTtcclxuICBnZXQoa2V5OiBzdHJpbmcpOiBhbnk7XHJcbiAgLyog5aaC5p6c6KaB57uZQXBwbGljYXRvaW4uZ2V05Yqg5LiK5paw55qEa2V577yM5Y+v5Lul5Zyo6ZyA6KaB55qE5Zyw5pa55aaC5LiL6L+Z5qC3bWVyZ2Xov5vlhaVBcHBsaWNhdGlvbjpcclxuICBpbXBvcnQgJ3BhdGhfdG8vYXBwbGljYXRpb24nXHJcbmltcG9ydCB7IENoYW5uZWxTZXJ2aWNlIH0gZnJvbSAnLi9jb21tb24vc2VydmljZS9jaGFubmVsU2VydmljZSc7XHJcbmltcG9ydCB7IFNlc3Npb25Db21wb25lbnQgfSBmcm9tICcuLi8uLi8uLi9naXRlZS9wb21lbG8tdHMvcG9tZWxvL2luZGV4JztcclxuaW1wb3J0IHsgUkVTRVJWRUQgfSBmcm9tICcuL3V0aWwvY29uc3RhbnRzJztcclxuICBkZWNsYXJlIG1vZHVsZSAncGF0aF90by9hcHBsaWNhdGlvbicge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBBcHBsaWNhdGlvbiB7XHJcbiAgICAgIGdldChzZXR0aW5nOiAnbXlrZXknKTpTb21lVHlwZTtcclxuICAgIH1cclxuICB9XHJcbiAgKi9cclxuICBnZXQoc2V0dGluZzogc3RyaW5nKTogYW55IHtcclxuICAgIHJldHVybiB0aGlzLl9zZXR0aW5nc1tzZXR0aW5nXTtcclxuICB9XHJcblxyXG4gIGVuYWJsZWQoc2V0dGluZzogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gISF0aGlzLmdldChzZXR0aW5nKTtcclxuICB9XHJcblxyXG4gIGRpc2FibGVkKHNldHRpbmc6IHN0cmluZykge1xyXG4gICAgcmV0dXJuICF0aGlzLmdldChzZXR0aW5nKTtcclxuICB9XHJcblxyXG4gIGVuYWJsZShzZXR0aW5nOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiB0aGlzLnNldChzZXR0aW5nLCB0cnVlKTtcclxuICB9XHJcblxyXG4gIGRpc2FibGUoc2V0dGluZzogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXQoc2V0dGluZywgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgY29uZmlndXJlKGVudjogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xyXG4gICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICBmbiA9IGFyZ3MucG9wKCk7XHJcbiAgICBlbnYgPSB0eXBlID0gUkVTRVJWRUQuQUxMO1xyXG5cclxuICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgICAgZW52ID0gYXJnc1swXTtcclxuICAgIH1cclxuICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgdHlwZSA9IGFyZ3NbMV07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVudiA9PT0gUkVTRVJWRUQuQUxMIHx8IGNvbnRhaW5zKHRoaXMuc2V0dGluZ3MuZW52LCBlbnYpKSB7XHJcbiAgICAgIGlmICh0eXBlID09PSBSRVNFUlZFRC5BTEwgfHwgY29udGFpbnModGhpcy5zZXR0aW5ncy5zZXJ2ZXJUeXBlLCB0eXBlKSkge1xyXG4gICAgICAgIGZuLmNhbGwodGhpcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgcmVnaXN0ZXJBZG1pbihcclxuICAgIG1vZHVsZUlkOiBzdHJpbmcsXHJcbiAgICBtb2R1bGU/OiBNb2R1bGUgfCBGdW5jdGlvbiB8IGFueSxcclxuICAgIG9wdHM/OiBhbnlcclxuICApIHtcclxuICAgIGxldCBtb2R1bGVzOiBNb2R1bGVJbmZvTWFwID0gdGhpcy5nZXQoS0VZV09SRFMuTU9EVUxFKTtcclxuICAgIGlmICghbW9kdWxlcykge1xyXG4gICAgICBtb2R1bGVzID0ge307XHJcbiAgICAgIHRoaXMuc2V0KEtFWVdPUkRTLk1PRFVMRSwgbW9kdWxlcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGVJZCAhPT0gXCJzdHJpbmdcIikge1xyXG4gICAgICBvcHRzID0gbW9kdWxlO1xyXG4gICAgICBtb2R1bGUgPSBtb2R1bGVJZDtcclxuICAgICAgaWYgKG1vZHVsZSkge1xyXG4gICAgICAgIG1vZHVsZUlkID0gKDxNb2R1bGU+bW9kdWxlKS5tb2R1bGVJZDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghbW9kdWxlSWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIG1vZHVsZXNbbW9kdWxlSWQgYXMgc3RyaW5nXSA9IHtcclxuICAgICAgbW9kdWxlSWQ6IG1vZHVsZUlkLFxyXG4gICAgICBtb2R1bGU6IG1vZHVsZSxcclxuICAgICAgb3B0czogb3B0c1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHVzZShwbHVnaW46IGFueSwgb3B0cz86IGFueSkge1xyXG4gICAgaWYgKCFwbHVnaW4uY29tcG9uZW50cykge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoXCJpbnZhbGlkIGNvbXBvbmVudHMsIG5vIGNvbXBvbmVudHMgZXhpc3RcIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgIGxldCBkaXIgPSBwYXRoLmRpcm5hbWUocGx1Z2luLmNvbXBvbmVudHMpO1xyXG5cclxuICAgIGlmICghZnMuZXhpc3RzU3luYyhwbHVnaW4uY29tcG9uZW50cykpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKFwiZmFpbCB0byBmaW5kIGNvbXBvbmVudHMsIGZpbmQgcGF0aDogJXNcIiwgcGx1Z2luLmNvbXBvbmVudHMpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZnMucmVhZGRpclN5bmMocGx1Z2luLmNvbXBvbmVudHMpLmZvckVhY2goZmlsZW5hbWUgPT4ge1xyXG4gICAgICBpZiAoIS9cXC5qcyQvLnRlc3QoZmlsZW5hbWUpKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGxldCBuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlbmFtZSwgXCIuanNcIik7XHJcbiAgICAgIGxldCBwYXJhbSA9IG9wdHNbbmFtZV0gfHwge307XHJcbiAgICAgIGxldCBhYnNvbHV0ZVBhdGggPSBwYXRoLmpvaW4oZGlyLCBESVIuQ09NUE9ORU5ULCBmaWxlbmFtZSk7XHJcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNvbHV0ZVBhdGgpKSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKFwiY29tcG9uZW50ICVzIG5vdCBleGlzdCBhdCAlc1wiLCBuYW1lLCBhYnNvbHV0ZVBhdGgpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubG9hZChyZXF1aXJlKGFic29sdXRlUGF0aCksIHBhcmFtKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gbG9hZCBldmVudHNcclxuICAgIGlmICghcGx1Z2luLmV2ZW50cykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGx1Z2luLmV2ZW50cykpIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoXCJmYWlsIHRvIGZpbmQgZXZlbnRzLCBmaW5kIHBhdGg6ICVzXCIsIHBsdWdpbi5ldmVudHMpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnMucmVhZGRpclN5bmMocGx1Z2luLmV2ZW50cykuZm9yRWFjaChmaWxlbmFtZSA9PiB7XHJcbiAgICAgICAgaWYgKCEvXFwuanMkLy50ZXN0KGZpbGVuYW1lKSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgYWJzb2x1dGVQYXRoID0gcGF0aC5qb2luKGRpciwgRElSLkVWRU5ULCBmaWxlbmFtZSk7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic29sdXRlUGF0aCkpIHtcclxuICAgICAgICAgIGxvZ2dlci5lcnJvcihcImV2ZW50cyAlcyBub3QgZXhpc3QgYXQgJXNcIiwgZmlsZW5hbWUsIGFic29sdXRlUGF0aCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGJpbmRFdmVudHMocmVxdWlyZShhYnNvbHV0ZVBhdGgpLCB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdHJhbnNhY3Rpb24oXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBjb25kaXRpb25zOiBDYWxsYmFja01hcCxcclxuICAgIGhhbmRsZXJzOiBDYWxsYmFja01hcCxcclxuICAgIHJldHJ5OiBudW1iZXJcclxuICApIHtcclxuICAgIGFwcE1hbmFnZXIudHJhbnNhY3Rpb24obmFtZSwgY29uZGl0aW9ucywgaGFuZGxlcnMsIHJldHJ5KTtcclxuICB9XHJcblxyXG4gIGdldFNlcnZlckJ5SWQoc2VydmVySWQ6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIHRoaXMuX3NlcnZlcnNbc2VydmVySWRdO1xyXG4gIH1cclxuXHJcbiAgZ2V0U2VydmVyRnJvbUNvbmZpZyhzZXJ2ZXJJZDogc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXJzRnJvbUNvbmZpZ1tzZXJ2ZXJJZF07XHJcbiAgfVxyXG5cclxuICBnZXRTZXJ2ZXJzQnlUeXBlKHNlcnZlclR5cGU6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIHRoaXMuX3NlcnZlclR5cGVNYXBzW3NlcnZlclR5cGVdO1xyXG4gIH1cclxuXHJcbiAgaXNGcm9udGVuZChzZXJ2ZXI/OiBTZXJ2ZXJJbmZvKSB7XHJcbiAgICBzZXJ2ZXIgPSBzZXJ2ZXIgfHwgdGhpcy5jdXJTZXJ2ZXI7XHJcbiAgICByZXR1cm4gISFzZXJ2ZXIgJiYgc2VydmVyLmZyb250ZW5kID09PSBcInRydWVcIjtcclxuICB9XHJcblxyXG4gIGlzQmFja2VuZChzZXJ2ZXI/OiBTZXJ2ZXJJbmZvKSB7XHJcbiAgICBzZXJ2ZXIgPSBzZXJ2ZXIgfHwgdGhpcy5jdXJTZXJ2ZXI7XHJcbiAgICByZXR1cm4gISFzZXJ2ZXIgJiYgIXNlcnZlci5mcm9udGVuZDtcclxuICB9XHJcblxyXG4gIGlzTWFzdGVyKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2VydmVyVHlwZSA9PT0gUkVTRVJWRUQuTUFTVEVSO1xyXG4gIH1cclxuXHJcbiAgYWRkU2VydmVycyhzZXJ2ZXJzOiBTZXJ2ZXJJbmZvW10pIHtcclxuICAgIGlmICghc2VydmVycyB8fCAhc2VydmVycy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gc2VydmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgbGV0IGl0ZW0gPSBzZXJ2ZXJzW2ldO1xyXG4gICAgICAvLyB1cGRhdGUgZ2xvYmFsIHNlcnZlciBtYXBcclxuICAgICAgdGhpcy5fc2VydmVyc1tpdGVtLmlkXSA9IGl0ZW07XHJcblxyXG4gICAgICAvLyB1cGRhdGUgZ2xvYmFsIHNlcnZlciB0eXBlIG1hcFxyXG4gICAgICBsZXQgc2xpc3QgPSB0aGlzLl9zZXJ2ZXJUeXBlTWFwc1tpdGVtLnNlcnZlclR5cGVdO1xyXG4gICAgICBpZiAoIXNsaXN0KSB7XHJcbiAgICAgICAgdGhpcy5fc2VydmVyVHlwZU1hcHNbaXRlbS5zZXJ2ZXJUeXBlXSA9IHNsaXN0ID0gW107XHJcbiAgICAgIH1cclxuICAgICAgcmVwbGFjZVNlcnZlcihzbGlzdCwgaXRlbSk7XHJcblxyXG4gICAgICAvLyB1cGRhdGUgZ2xvYmFsIHNlcnZlciB0eXBlIGxpc3RcclxuICAgICAgaWYgKHRoaXMuc2VydmVyVHlwZXMuaW5kZXhPZihpdGVtLnNlcnZlclR5cGUpIDwgMCkge1xyXG4gICAgICAgIHRoaXMuc2VydmVyVHlwZXMucHVzaChpdGVtLnNlcnZlclR5cGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLkFERF9TRVJWRVJTLCBzZXJ2ZXJzKTtcclxuICB9XHJcblxyXG4gIHJlbW92ZVNlcnZlcnMoaWRzOiBzdHJpbmdbXSkge1xyXG4gICAgaWYgKCFpZHMgfHwgIWlkcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gaWRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICBsZXQgaWQgPSBpZHNbaV07XHJcbiAgICAgIGxldCBpdGVtID0gdGhpcy5zZXJ2ZXJzW2lkXTtcclxuICAgICAgaWYgKCFpdGVtKSB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgLy8gY2xlYW4gZ2xvYmFsIHNlcnZlciBtYXBcclxuICAgICAgZGVsZXRlIHRoaXMuX3NlcnZlcnNbaWRdO1xyXG5cclxuICAgICAgLy8gY2xlYW4gZ2xvYmFsIHNlcnZlciB0eXBlIG1hcFxyXG4gICAgICBsZXQgc2xpc3QgPSB0aGlzLl9zZXJ2ZXJUeXBlTWFwc1tpdGVtLnNlcnZlclR5cGVdO1xyXG4gICAgICByZW1vdmVTZXJ2ZXIoc2xpc3QsIGlkKTtcclxuICAgICAgLy8gVE9ETzogc2hvdWxkIHJlbW92ZSB0aGUgc2VydmVyIHR5cGUgaWYgdGhlIHNsaXN0IGlzIGVtcHR5P1xyXG4gICAgfVxyXG4gICAgdGhpcy5ldmVudC5lbWl0KGV2ZW50cy5SRU1PVkVfU0VSVkVSUywgaWRzKTtcclxuICB9XHJcblxyXG4gIHJlcGxhY2VTZXJ2ZXJzKHNlcnZlcnM6IFNlcnZlckluZm9NYXApIHtcclxuICAgIGlmICghc2VydmVycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5fc2VydmVycyA9IHNlcnZlcnM7XHJcbiAgICB0aGlzLl9zZXJ2ZXJUeXBlTWFwcyA9IHt9O1xyXG4gICAgdGhpcy5fc2VydmVyVHlwZXMgPSBbXTtcclxuICAgIGxldCBzZXJ2ZXJBcnJheSA9IFtdO1xyXG4gICAgZm9yIChsZXQgaWQgaW4gc2VydmVycykge1xyXG4gICAgICBsZXQgc2VydmVyID0gc2VydmVyc1tpZF07XHJcbiAgICAgIGxldCBzZXJ2ZXJUeXBlID0gc2VydmVyW1JFU0VSVkVELlNFUlZFUl9UWVBFXTtcclxuICAgICAgbGV0IHNsaXN0ID0gdGhpcy5fc2VydmVyVHlwZU1hcHNbc2VydmVyVHlwZV07XHJcbiAgICAgIGlmICghc2xpc3QpIHtcclxuICAgICAgICB0aGlzLl9zZXJ2ZXJUeXBlTWFwc1tzZXJ2ZXJUeXBlXSA9IHNsaXN0ID0gW107XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5fc2VydmVyVHlwZU1hcHNbc2VydmVyVHlwZV0ucHVzaChzZXJ2ZXIpO1xyXG4gICAgICAvLyB1cGRhdGUgZ2xvYmFsIHNlcnZlciB0eXBlIGxpc3RcclxuICAgICAgaWYgKHRoaXMuX3NlcnZlclR5cGVzLmluZGV4T2Yoc2VydmVyVHlwZSkgPCAwKSB7XHJcbiAgICAgICAgdGhpcy5fc2VydmVyVHlwZXMucHVzaChzZXJ2ZXJUeXBlKTtcclxuICAgICAgfVxyXG4gICAgICBzZXJ2ZXJBcnJheS5wdXNoKHNlcnZlcik7XHJcbiAgICB9XHJcbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLlJFUExBQ0VfU0VSVkVSUywgc2VydmVyQXJyYXkpO1xyXG4gIH1cclxuXHJcbiAgYWRkQ3JvbnMoY3JvbnM6IENyb25bXSkge1xyXG4gICAgaWYgKCFjcm9ucyB8fCAhY3JvbnMubGVuZ3RoKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKFwiY3JvbnMgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmV2ZW50LmVtaXQoZXZlbnRzLkFERF9DUk9OUywgY3JvbnMpO1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlQ3JvbnMoY3JvbnM6IENyb25bXSkge1xyXG4gICAgaWYgKCFjcm9ucyB8fCAhY3JvbnMubGVuZ3RoKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKFwiaWRzIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5ldmVudC5lbWl0KGV2ZW50cy5SRU1PVkVfQ1JPTlMsIGNyb25zKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgbG9hZFNlcnZlcnMoKSB7XHJcbiAgICB0aGlzLmxvYWRDb25maWdCYXNlQXBwKFJFU0VSVkVELlNFUlZFUlMsIEZJTEVQQVRILlNFUlZFUik7XHJcbiAgICBjb25zdCBzZXJ2ZXJzID0gdGhpcy5nZXQoUkVTRVJWRUQuU0VSVkVSUykgYXMgU2VydmVySW5mb0FycmF5TWFwO1xyXG4gICAgbGV0IHNlcnZlck1hcDogU2VydmVySW5mb01hcCA9IHt9O1xyXG4gICAgZm9yIChsZXQgc2VydmVyVHlwZSBpbiBzZXJ2ZXJzKSB7XHJcbiAgICAgIGxldCBzbGlzdCA9IHNlcnZlcnNbc2VydmVyVHlwZV07XHJcbiAgICAgIGZvciAobGV0IHNlcnZlciBvZiBzbGlzdCkge1xyXG4gICAgICAgIHNlcnZlci5zZXJ2ZXJUeXBlID0gc2VydmVyVHlwZTtcclxuICAgICAgICBpZiAoc2VydmVyW1JFU0VSVkVELkNMVVNURVJfQ09VTlRdKSB7XHJcbiAgICAgICAgICB0aGlzLmxvYWRDbHVzdGVyKHNlcnZlciwgc2VydmVyTWFwKTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXJ2ZXJNYXBbc2VydmVyLmlkXSA9IHNlcnZlcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgdGhpcy5zZXQoS0VZV09SRFMuU0VSVkVSX01BUCwgc2VydmVyTWFwKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcHJvY2Vzc0FyZ3MoYXJnczogQXJnc01hcCkge1xyXG4gICAgbGV0IHNlcnZlclR5cGUgPSBhcmdzLnNlcnZlclR5cGUgfHwgUkVTRVJWRUQuTUFTVEVSO1xyXG4gICAgbGV0IHNlcnZlcklkID0gYXJncy5pZCB8fCB0aGlzLm1hc3Rlci5pZDtcclxuICAgIGxldCBtb2RlID0gYXJncy5tb2RlIHx8IFJFU0VSVkVELkNMVVNURVI7XHJcbiAgICBsZXQgbWFzdGVyaGEgPSBhcmdzLm1hc3RlcmhhIHx8IFwiZmFsc2VcIjtcclxuICAgIGxldCB0eXBlID0gYXJncy50eXBlIHx8IFJFU0VSVkVELkFMTDtcclxuICAgIGxldCBzdGFydElkID0gYXJncy5zdGFydElkO1xyXG5cclxuICAgIHRoaXMuc2V0KFJFU0VSVkVELk1BSU4sIGFyZ3MubWFpbik7XHJcbiAgICB0aGlzLnNldChSRVNFUlZFRC5TRVJWRVJfVFlQRSwgc2VydmVyVHlwZSk7XHJcbiAgICB0aGlzLnNldChSRVNFUlZFRC5TRVJWRVJfSUQsIHNlcnZlcklkKTtcclxuICAgIHRoaXMuc2V0KFJFU0VSVkVELk1PREUsIG1vZGUpO1xyXG4gICAgdGhpcy5zZXQoUkVTRVJWRUQuVFlQRSwgdHlwZSk7XHJcbiAgICBpZiAoISFzdGFydElkKSB7XHJcbiAgICAgIHRoaXMuc2V0KFJFU0VSVkVELlNUQVJUSUQsIHN0YXJ0SWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChtYXN0ZXJoYSA9PT0gXCJ0cnVlXCIpIHtcclxuICAgICAgdGhpcy5zZXQoUkVTRVJWRUQuTUFTVEVSLCBhcmdzKTtcclxuICAgICAgdGhpcy5zZXQoUkVTRVJWRUQuQ1VSUkVOVF9TRVJWRVIsIGFyZ3MpO1xyXG4gICAgfSBlbHNlIGlmIChzZXJ2ZXJUeXBlICE9PSBSRVNFUlZFRC5NQVNURVIpIHtcclxuICAgICAgdGhpcy5zZXQoUkVTRVJWRUQuQ1VSUkVOVF9TRVJWRVIsIGFyZ3MpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zZXQoUkVTRVJWRUQuQ1VSUkVOVF9TRVJWRVIsIHRoaXMubWFzdGVyKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY29uZmlnTG9nZ2VyKCkge1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LlBPTUVMT19MT0dHRVIgIT09IFwib2ZmXCIpIHtcclxuICAgICAgbGV0IGVudiA9IHRoaXMuZ2V0KFJFU0VSVkVELkVOVik7XHJcbiAgICAgIGxldCBvcmlnaW5QYXRoID0gcGF0aC5qb2luKHRoaXMuYmFzZSwgRklMRVBBVEguTE9HKTtcclxuICAgICAgbGV0IHByZXNlbnRQYXRoID0gcGF0aC5qb2luKFxyXG4gICAgICAgIHRoaXMuYmFzZSxcclxuICAgICAgICBGSUxFUEFUSC5DT05GSUdfRElSLFxyXG4gICAgICAgIGVudixcclxuICAgICAgICBwYXRoLmJhc2VuYW1lKEZJTEVQQVRILkxPRylcclxuICAgICAgKTtcclxuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMob3JpZ2luUGF0aCkpIHtcclxuICAgICAgICB0aGlzLmxvZ0NvbmZpZ3VyZShvcmlnaW5QYXRoKTtcclxuICAgICAgfSBlbHNlIGlmIChmcy5leGlzdHNTeW5jKHByZXNlbnRQYXRoKSkge1xyXG4gICAgICAgIHRoaXMubG9nQ29uZmlndXJlKHByZXNlbnRQYXRoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIuZXJyb3IoXCJsb2dnZXIgZmlsZSBwYXRoIGNvbmZpZ3VyYXRpb24gaXMgZXJyb3IuXCIpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGxvYWRMaWZlY3ljbGUoKSB7XHJcbiAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4oXHJcbiAgICAgIHRoaXMuYmFzZSxcclxuICAgICAgRklMRVBBVEguU0VSVkVSX0RJUixcclxuICAgICAgdGhpcy5zZXJ2ZXJUeXBlLFxyXG4gICAgICBGSUxFUEFUSC5MSUZFQ1lDTEVcclxuICAgICk7XHJcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGxldCBsaWZlY3ljbGUgPSByZXF1aXJlKGZpbGVQYXRoKTtcclxuICAgIGZvciAobGV0IGtleSBpbiBsaWZlY3ljbGUpIHtcclxuICAgICAgaWYgKHR5cGVvZiBsaWZlY3ljbGVba2V5XSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgdGhpcy5fbGlmZWN5Y2xlQ2JzW2tleV0gPSBsaWZlY3ljbGVba2V5XTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsb2dnZXIud2FybihcImxpZmVjeWNsZS5qcyBpbiAlcyBpcyBlcnJvciBmb3JtYXQuXCIsIGZpbGVQYXRoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbG9nQ29uZmlndXJlKGZpbGVuYW1lOiBzdHJpbmcpIHtcclxuICAgIExvZ2dlci5jb25maWd1cmUoZmlsZW5hbWUsIHsgc2VydmVySWQ6IHRoaXMuc2VydmVySWQsIGJhc2U6IHRoaXMuYmFzZSB9KTtcclxuICB9XHJcblxyXG4gIGRlZmF1bHRDb25maWd1cmF0aW9uKCkge1xyXG4gICAgY29uc3QgYXJncyA9IHBhcnNlQXJncyhwcm9jZXNzLmFyZ3YpO1xyXG4gICAgdGhpcy5zZXQoXHJcbiAgICAgIFJFU0VSVkVELkVOVixcclxuICAgICAgYXJncy5lbnYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgUkVTRVJWRUQuRU5WX0RFVlxyXG4gICAgKTtcclxuICAgIHRoaXMubG9hZENvbmZpZ0Jhc2VBcHAoUkVTRVJWRUQuTUFTVEVSLCBGSUxFUEFUSC5NQVNURVIpO1xyXG4gICAgdGhpcy5sb2FkU2VydmVycygpO1xyXG4gICAgdGhpcy5wcm9jZXNzQXJncyhhcmdzKTtcclxuICAgIHRoaXMuY29uZmlnTG9nZ2VyKCk7XHJcbiAgICB0aGlzLmxvYWRMaWZlY3ljbGUoKTtcclxuICB9XHJcblxyXG4gIGxvYWRDbHVzdGVyKHNlcnZlcjogU2VydmVySW5mbywgc2VydmVyTWFwOiBTZXJ2ZXJJbmZvTWFwKSB7XHJcbiAgICBsZXQgaW5jcmVhc2VGaWVsZHM6IHsgW2lkeDogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcclxuICAgIGxldCBob3N0ID0gc2VydmVyLmhvc3Q7XHJcbiAgICBsZXQgY291bnQgPSBwYXJzZUludChzZXJ2ZXJbUkVTRVJWRUQuQ0xVU1RFUl9DT1VOVF0pO1xyXG4gICAgbGV0IHNlcSA9IHRoaXMuY2x1c3RlclNlcVtzZXJ2ZXIuc2VydmVyVHlwZV07XHJcbiAgICBpZiAoIXNlcSkge1xyXG4gICAgICBzZXEgPSAwO1xyXG4gICAgICB0aGlzLl9jbHVzdGVyU2VxW3NlcnZlci5zZXJ2ZXJUeXBlXSA9IGNvdW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5fY2x1c3RlclNlcVtzZXJ2ZXIuc2VydmVyVHlwZV0gPSBzZXEgKyBjb3VudDtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGxldCBrZXkgaW4gc2VydmVyKSB7XHJcbiAgICAgIGxldCB2YWx1ZSA9IHNlcnZlcltrZXldLnRvU3RyaW5nKCk7XHJcbiAgICAgIGlmICh2YWx1ZS5pbmRleE9mKFJFU0VSVkVELkNMVVNURVJfU0lHTkFMKSA+IDApIHtcclxuICAgICAgICBsZXQgYmFzZSA9IHNlcnZlcltrZXldLnNsaWNlKDAsIC0yKTtcclxuICAgICAgICBpbmNyZWFzZUZpZWxkc1trZXldID0gYmFzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCBjbG9uZSA9IChzcmM6IGFueSkgPT4ge1xyXG4gICAgICBsZXQgcnMgPSB7fSBhcyBhbnk7XHJcbiAgICAgIGZvciAobGV0IGtleSBpbiBzcmMpIHtcclxuICAgICAgICByc1trZXldID0gc3JjW2tleV07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJzO1xyXG4gICAgfTtcclxuICAgIGZvciAobGV0IGkgPSAwLCBsID0gc2VxOyBpIDwgY291bnQ7IGkrKywgbCsrKSB7XHJcbiAgICAgIGxldCBjc2VydmVyID0gY2xvbmUoc2VydmVyKTtcclxuICAgICAgY3NlcnZlci5pZCA9IFJFU0VSVkVELkNMVVNURVJfUFJFRklYICsgc2VydmVyLnNlcnZlclR5cGUgKyBcIi1cIiArIGw7XHJcbiAgICAgIGZvciAobGV0IGsgaW4gaW5jcmVhc2VGaWVsZHMpIHtcclxuICAgICAgICBsZXQgdiA9IHBhcnNlSW50KGluY3JlYXNlRmllbGRzW2tdKTtcclxuICAgICAgICBjc2VydmVyW2tdID0gdiArIGk7XHJcbiAgICAgIH1cclxuICAgICAgc2VydmVyTWFwW2NzZXJ2ZXIuaWRdID0gY3NlcnZlcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXJ0QnlUeXBlKGNiPzogRnVuY3Rpb24pIHtcclxuICAgIGlmICghIXRoaXMuc3RhcnRJZCkge1xyXG4gICAgICBpZiAodGhpcy5zdGFydElkID09PSBSRVNFUlZFRC5NQVNURVIpIHtcclxuICAgICAgICBpbnZva2VDYWxsYmFjayhjYiEpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJ1blNlcnZlcnModGhpcyk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChcclxuICAgICAgICAhIXRoaXMudHlwZSAmJlxyXG4gICAgICAgIHRoaXMudHlwZSAhPT0gUkVTRVJWRUQuQUxMICYmXHJcbiAgICAgICAgdGhpcy50eXBlICE9PSBSRVNFUlZFRC5NQVNURVJcclxuICAgICAgKSB7XHJcbiAgICAgICAgcnVuU2VydmVycyh0aGlzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpbnZva2VDYWxsYmFjayhjYiEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsb2FkRGVmYXVsdENvbXBvbmVudHMoKSB7XHJcbiAgICBsZXQgcG9tZWxvID0gcmVxdWlyZShcIi4vcG9tZWxvXCIpLmRlZmF1bHQ7XHJcbiAgICAvLyBsb2FkIHN5c3RlbSBkZWZhdWx0IGNvbXBvbmVudHNcclxuICAgIGlmICh0aGlzLnNlcnZlclR5cGUgPT09IFJFU0VSVkVELk1BU1RFUikge1xyXG4gICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ubWFzdGVyLCB0aGlzLmdldChcIm1hc3RlckNvbmZpZ1wiKSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ucHJveHksIHRoaXMuZ2V0KFwicHJveHlDb25maWdcIikpO1xyXG4gICAgICBpZiAodGhpcy5jdXJTZXJ2ZXIucG9ydCkge1xyXG4gICAgICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5yZW1vdGUsIHRoaXMuZ2V0KFwicmVtb3RlQ29uZmlnXCIpKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAodGhpcy5pc0Zyb250ZW5kKCkpIHtcclxuICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8uY29ubmVjdGlvbiwgdGhpcy5nZXQoXCJjb25uZWN0aW9uQ29uZmlnXCIpKTtcclxuICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8uY29ubmVjdG9yLCB0aGlzLmdldChcImNvbm5lY3RvckNvbmZpZ1wiKSk7XHJcbiAgICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLnNlc3Npb24sIHRoaXMuZ2V0KFwic2Vzc2lvbkNvbmZpZ1wiKSk7XHJcbiAgICAgICAgLy8gY29tcGF0aWJsZSBmb3Igc2NoZWR1bGVyQ29uZmlnXHJcbiAgICAgICAgaWYgKHRoaXMuZ2V0KFwic2NoZWR1bGVyQ29uZmlnXCIpKSB7XHJcbiAgICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ucHVzaFNjaGVkdWxlciwgdGhpcy5nZXQoXCJzY2hlZHVsZXJDb25maWdcIikpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmxvYWQoPGFueT5wb21lbG8ucHVzaFNjaGVkdWxlciwgdGhpcy5nZXQoXCJwdXNoU2NoZWR1bGVyQ29uZmlnXCIpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLmJhY2tlbmRTZXNzaW9uLCB0aGlzLmdldChcImJhY2tlbmRTZXNzaW9uQ29uZmlnXCIpKTtcclxuICAgICAgdGhpcy5sb2FkKDxhbnk+cG9tZWxvLmNoYW5uZWwsIHRoaXMuZ2V0KFwiY2hhbm5lbENvbmZpZ1wiKSk7XHJcbiAgICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5zZXJ2ZXIsIHRoaXMuZ2V0KFwic2VydmVyQ29uZmlnXCIpKTtcclxuICAgIH1cclxuICAgIHRoaXMubG9hZCg8YW55PnBvbWVsby5tb25pdG9yLCB0aGlzLmdldChcIm1vbml0b3JDb25maWdcIikpO1xyXG4gIH1cclxuXHJcbiAgc3RvcENvbXBzKGNvbXBzOiBhbnlbXSwgaW5kZXg6IG51bWJlciwgZm9yY2U6IGJvb2xlYW4sIGNiPzogRnVuY3Rpb24pIHtcclxuICAgIGlmIChpbmRleCA+PSBjb21wcy5sZW5ndGgpIHtcclxuICAgICAgaW52b2tlQ2FsbGJhY2soY2IhKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgbGV0IGNvbXAgPSBjb21wc1tpbmRleF07XHJcbiAgICBpZiAodHlwZW9mIGNvbXAuc3RvcCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGNvbXAuc3RvcChmb3JjZSwgKCkgPT4ge1xyXG4gICAgICAgIC8vIGlnbm9yZSBhbnkgZXJyb3JcclxuICAgICAgICB0aGlzLnN0b3BDb21wcyhjb21wcywgaW5kZXggKyAxLCBmb3JjZSwgY2IpO1xyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc3RvcENvbXBzKGNvbXBzLCBpbmRleCArIDEsIGZvcmNlLCBjYik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvcHRDb21wb25lbnRzKGNvbXBzOiBhbnlbXSwgbWV0aG9kOiBzdHJpbmcsIGNiPzogRnVuY3Rpb24pIHtcclxuICAgIC8qXHJcbiAgICBhc3luYyBmdW5jdGlvbiBjYWxsQ29tcE1ldGhvZChjb21wOiBhbnkpIHtcclxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChjLCBlKSA9PiB7XHJcbiAgICAgICAgY29tcFttZXRob2RdKGMpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIGZvciAobGV0IGNvbXAgb2YgY29tcHMpIHtcclxuICAgICAgaWYgKHR5cGVvZiBjb21wW21ldGhvZF0gPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGxldCBlcnI6IGFueSA9IGF3YWl0IGNhbGxDb21wTWV0aG9kKGNvbXApO1xyXG4gICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgIGlmICh0eXBlb2YgZXJyID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcclxuICAgICAgICAgICAgICBcImZhaWwgdG8gb3BlcmF0ZSBjb21wb25lbnQsIG1ldGhvZDogJXMsIGVycjogJWpcIixcclxuICAgICAgICAgICAgICBtZXRob2QsXHJcbiAgICAgICAgICAgICAgZXJyXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoXHJcbiAgICAgICAgICAgICAgXCJmYWlsIHRvIG9wZXJhdGUgY29tcG9uZW50LCBtZXRob2Q6ICVzLCBlcnI6ICVqXCIsXHJcbiAgICAgICAgICAgICAgbWV0aG9kLFxyXG4gICAgICAgICAgICAgIGVyci5zdGFja1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaW52b2tlQ2FsbGJhY2soY2IhLCBlcnIpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaW52b2tlQ2FsbGJhY2soY2IhKTtcclxuICAgICovXHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICBhc3luYy5mb3JFYWNoU2VyaWVzKFxyXG4gICAgICBjb21wcyxcclxuICAgICAgKGNvbXA6IGFueSwgZG9uZTogYW55KSA9PiB7XHJcbiAgICAgICAgaSsrO1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29tcFttZXRob2RdID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgIGNvbXBbbWV0aG9kXShkb25lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgKGVycjogYW55KSA9PiB7XHJcbiAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgaWYgKHR5cGVvZiBlcnIgPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKFxyXG4gICAgICAgICAgICAgIFwiZmFpbCB0byBvcGVyYXRlIGNvbXBvbmVudCwgbWV0aG9kOiAlcywgZXJyOiAlalwiLFxyXG4gICAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgICBlcnJcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihcclxuICAgICAgICAgICAgICBcImZhaWwgdG8gb3BlcmF0ZSBjb21wb25lbnQsIG1ldGhvZDogJXMsIGVycjogJWpcIixcclxuICAgICAgICAgICAgICBtZXRob2QsXHJcbiAgICAgICAgICAgICAgZXJyLnN0YWNrXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGludm9rZUNhbGxiYWNrKGNiISwgZXJyKTtcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlQXJncyhhcmdzOiBzdHJpbmdbXSkge1xyXG4gIGxldCBhcmdzTWFwOiBBcmdzTWFwID0ge307XHJcbiAgbGV0IG1haW5Qb3MgPSAxO1xyXG5cclxuICB3aGlsZSAoYXJnc1ttYWluUG9zXS5pbmRleE9mKFwiLS1cIikgPiAwKSB7XHJcbiAgICBtYWluUG9zKys7XHJcbiAgfVxyXG4gIGFyZ3NNYXAubWFpbiA9IGFyZ3NbbWFpblBvc107XHJcblxyXG4gIGZvciAobGV0IGkgPSBtYWluUG9zICsgMTsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgIGxldCBhcmcgPSBhcmdzW2ldO1xyXG4gICAgbGV0IHNlcCA9IGFyZy5pbmRleE9mKFwiPVwiKTtcclxuICAgIGxldCBrZXkgPSBhcmcuc2xpY2UoMCwgc2VwKTtcclxuICAgIGxldCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyID0gYXJnLnNsaWNlKHNlcCArIDEpO1xyXG4gICAgaWYgKCFpc05hTihOdW1iZXIodmFsdWUpKSAmJiB2YWx1ZS5pbmRleE9mKFwiLlwiKSA8IDApIHtcclxuICAgICAgdmFsdWUgPSBOdW1iZXIodmFsdWUpO1xyXG4gICAgfVxyXG4gICAgYXJnc01hcFtrZXldID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYXJnc01hcDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVwbGFjZVNlcnZlcihzbGlzdDogU2VydmVySW5mb1tdLCBzZXJ2ZXJJbmZvOiBTZXJ2ZXJJbmZvKSB7XHJcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBzbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIGlmIChzbGlzdFtpXS5pZCA9PT0gc2VydmVySW5mby5pZCkge1xyXG4gICAgICBzbGlzdFtpXSA9IHNlcnZlckluZm87XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcbiAgc2xpc3QucHVzaChzZXJ2ZXJJbmZvKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlU2VydmVyKHNsaXN0OiBTZXJ2ZXJJbmZvW10sIGlkOiBzdHJpbmcpIHtcclxuICBpZiAoIXNsaXN0IHx8ICFzbGlzdC5sZW5ndGgpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGZvciAobGV0IGkgPSAwLCBsID0gc2xpc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICBpZiAoc2xpc3RbaV0uaWQgPT09IGlkKSB7XHJcbiAgICAgIHNsaXN0LnNwbGljZShpLCAxKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY29udGFpbnMoc3RyOiBzdHJpbmcsIHNldHRpbmdzOiBzdHJpbmcpIHtcclxuICBpZiAoIXNldHRpbmdzKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBsZXQgdHMgPSBzZXR0aW5ncy5zcGxpdChcInxcIik7XHJcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSB0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIGlmIChzdHIgPT09IHRzW2ldKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmludGVyZmFjZSBFdmVudENvbnN0cnVjdG9yPFQ+IHtcclxuICBuZXcgKGFwcDogQXBwbGljYXRpb24pOiBUO1xyXG59XHJcblxyXG5mdW5jdGlvbiBiaW5kRXZlbnRzPFQ+KEV2ZW50OiBFdmVudENvbnN0cnVjdG9yPFQ+LCBhcHA6IEFwcGxpY2F0aW9uKSB7XHJcbiAgbGV0IGVtZXRob2RzID0gbmV3IEV2ZW50KGFwcCk7XHJcbiAgZm9yIChsZXQgbSBpbiBlbWV0aG9kcykge1xyXG4gICAgaWYgKHR5cGVvZiBlbWV0aG9kc1ttXSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGFwcC5ldmVudC5vbihtLCAoPGFueT5lbWV0aG9kc1ttXSkuYmluZChlbWV0aG9kcykpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYWRkRmlsdGVyKGFwcDogQXBwbGljYXRpb24sIHR5cGU6IHN0cmluZywgZmlsdGVyOiBGaWx0ZXIgfCBSUENGaWx0ZXIpIHtcclxuICBsZXQgZmlsdGVycyA9IGFwcC5nZXQodHlwZSk7XHJcbiAgaWYgKCFmaWx0ZXJzKSB7XHJcbiAgICBmaWx0ZXJzID0gW107XHJcbiAgICBhcHAuc2V0KHR5cGUsIGZpbHRlcnMpO1xyXG4gIH1cclxuICBmaWx0ZXJzLnB1c2goZmlsdGVyKTtcclxufVxyXG5cclxuZXhwb3J0IHsgQXBwbGljYXRpb24gfTtcclxuIl19