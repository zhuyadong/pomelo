import os = require("os");
let admin = require("pomelo-admin");
import utils = require("./utils");
import pathUtil = require("./pathUtil");
import starter = require("../master/starter");
import { Component, Module, ModuleInfoMap } from '../application';
import { KEYWORDS, PLATFORM } from "./constants";
import { Application } from "../index";
import { ModuleInfo } from "../../index";
let logger = require("pomelo-logger").getLogger("pomelo", __filename);

//TODO:self & consoleService types
export function loadModules(self: any, consoleService: any) {
  // load app register modules
  let _modules : ModuleInfoMap = self.app!.get(KEYWORDS.MODULE);

  if (!_modules) {
    return;
  }

  let modules :ModuleInfo[] = [];
  for (let m in _modules) {
    modules.push(_modules[m]);
  }

  for (let i = 0, l = modules.length; i < l; i++) {
    let module : Module;
    let record = modules[i];
    if (typeof record.module === "function") {
      module = record.module(record.opts, consoleService);
    } else {
      module = record.module;
    }

    let moduleId = record.moduleId || module.moduleId;

    if (!moduleId) {
      logger.warn("ignore an unknown module.");
      continue;
    }

    consoleService.register(moduleId, module);
    self.modules.push(module);
  }
}

export function startModules(modules: Module[], cb?: Function) {
  // invoke the start lifecycle method of modules

  if (!modules) {
    return;
  }
  startModule(null, modules, 0, cb);
}

export function registerDefaultModules(
  isMaster: boolean,
  app: Application,
  closeWatcher: boolean = false
) {
  if (!closeWatcher) {
    if (isMaster) {
      app.registerAdmin(require("../modules/masterwatcher"), { app: app });
    } else {
      app.registerAdmin(require("../modules/monitorwatcher"), { app: app });
    }
  }
  app.registerAdmin(admin.modules.watchServer, { app: app });
  app.registerAdmin(require("../modules/console"), {
    app: app,
    starter: starter
  });
  if (app.enabled("systemMonitor")) {
    if (os.platform() !== PLATFORM.WIN) {
      app.registerAdmin(admin.modules.systemInfo);
      app.registerAdmin(admin.modules.nodeInfo);
    }
    app.registerAdmin(admin.modules.monitorLog, {
      path: pathUtil.getLogPath(app.base)
    });
    app.registerAdmin(admin.modules.scripts, {
      app: app,
      path: pathUtil.getScriptPath(app.base)
    });
    if (os.platform() !== PLATFORM.WIN) {
      app.registerAdmin(admin.modules.profiler);
    }
  }
}

function startModule(
  err: any,
  modules: Module[],
  index: number,
  cb?: Function
) {
  if (err || index >= modules.length) {
    utils.invokeCallback(cb!, err);
    return;
  }

  let module = modules[index];
  if (module && typeof module.start === "function") {
    module.start(function(err: any) {
      startModule(err, modules, index + 1, cb);
    });
  } else {
    startModule(err, modules, index + 1, cb);
  }
}
