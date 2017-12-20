import { Application, ServerInfo } from "../application";
import { RESERVED, PLATFORM, COMMAND } from "../util/constants";
import { isLocal } from "../util/utils";
import { format } from "util";
import os = require("os");
import pomelo from "../pomelo";
import cp = require("child_process");

const logger = require("pomelo-logger").getLogger("pomelo", __filename);

var env = RESERVED.ENV_DEV;
var cpus: { [idx: string]: number } = {};

export function runServers(app: Application) {
  const condition = app.startId || app.type;
  switch (condition) {
    case RESERVED.MASTER:
      break;
    case RESERVED.ALL:
      const servers = app.serversFromConfig;
      for (let serverId in servers) {
        run(app, servers[serverId]);
      }
      break;
    default:
      const server = app.getServerFromConfig(condition);
      if (!!server) {
        run(app, server);
      } else {
        const servers = app.get("servers")[condition];
        for (let i = 0; i < servers.length; i++) {
          run(app, servers[i]);
        }
      }
  }
}

export function run(app: Application, server: ServerInfo, cb?: Function) {
  env = app.get("env");
  if (isLocal(server.host)) {
    let options: string[] = [];
    if (!!server.args) {
      if (typeof server.args === "string") {
        options.push(server.args.trim());
      } else {
        options = options.concat(server.args);
      }
    }
    let cmd = app.get(RESERVED.MAIN);
    options.push(cmd);
    options.push(format("env=%s", env));
    for (let key in server) {
      if (key === RESERVED.CPU) {
        cpus[server.id] = server[key];
      }
      options.push(format("%s=%s", key, server[key]));
    }
    localrun(process.execPath, null, options, cb);
  } else {
    let cmd = format('cd "%s" && "%s"', app.base, process.execPath);
    let arg = server.args;
    if (arg !== undefined) {
      cmd += arg;
    }
    cmd += format(' "%s" env=%s ', app.get(RESERVED.MAIN), env);
    for (let key in server) {
      if (key === RESERVED.CPU) {
        cpus[server.id] = server[key];
      }
      cmd += format(" %s=%s ", key, server[key]);
    }
    sshrun(cmd, server.host, cb);
  }
}

export function bindCpu(sid: string, pid: string, host: string) {
  if (os.platform() === PLATFORM.LINUX && cpus[sid] !== undefined) {
    if (isLocal(host)) {
      let options: string[] = [];
      options.push("-pc");
      options.push(cpus[sid].toString());
      options.push(pid);
      localrun(COMMAND.TASKSET, null, options);
    } else {
      let cmd = format('taskset -pc "%s" "%s"', cpus[sid], pid);
      sshrun(cmd, host);
    }
  }
}

export function kill(pids: string[], servers: ServerInfo[]) {
  let cmd;
  for (let i = 0; i < servers.length; i++) {
    let server = servers[i];
    if (isLocal(server.host)) {
      let options: string[] = [];
      if (os.platform() === PLATFORM.WIN) {
        cmd = COMMAND.TASKKILL;
        options.push("/pid");
        options.push("/f");
      } else {
        cmd = COMMAND.KILL;
        options.push("-9");
      }
      options.push(pids[i]);
      localrun(cmd, null, options);
    } else {
      if (os.platform() === PLATFORM.WIN) {
        cmd = format("taskkill /pid %s /f", pids[i]);
      } else {
        cmd = format("kill -9 %s", pids[i]);
      }
      sshrun(cmd, server.host);
    }
  }
}

export function sshrun(cmd: string, host: string, cb?: Function) {
  var args = [];
  args.push(host);
  var ssh_params = pomelo.app.get(RESERVED.SSH_CONFIG_PARAMS);
  if (!!ssh_params && Array.isArray(ssh_params)) {
    args = args.concat(ssh_params);
  }
  args.push(cmd);

  logger.info("Executing " + cmd + " on " + host + ":22");
  spawnProcess(COMMAND.SSH, host, args, cb);
  return;
}

export function localrun(
  cmd: string,
  host: string | null,
  options: string[],
  cb?: Function
) {
  logger.info("Executing " + cmd + " " + options + " locally");
  spawnProcess(cmd, host, options, cb);
}

function spawnProcess(
  command: string,
  host: string | null,
  options: string[],
  cb?: Function
) {
  var child = null;

  if (env === RESERVED.ENV_DEV) {
    child = cp.spawn(command, options);
    var prefix = command === COMMAND.SSH ? "[" + host + "] " : "";

    child.stderr.on("data", chunk => {
      var msg = chunk.toString();
      process.stderr.write(msg);
      if (!!cb) {
        cb(msg);
      }
    });

    child.stdout.on("data", chunk => {
      var msg = prefix + chunk.toString();
      process.stdout.write(msg);
    });
  } else {
    child = cp.spawn(command, options, { detached: true, stdio: "inherit" });
    child.unref();
  }

  child.on("exit", code => {
    if (code !== 0) {
      logger.warn(
        "child process exit with error, error code: %s, executed command: %s",
        code,
        command
      );
    }
    if (typeof cb === "function") {
      cb(code === 0 ? null : code);
    }
  });
}
