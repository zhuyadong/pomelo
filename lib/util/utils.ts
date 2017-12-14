import os = require("os");
import util = require("util");
import { exec } from "child_process";
import Constants = require("./constants");
const logger = require("pomelo-logger").getLogger("pomelo", __filename);
import { Application, ServerInfo } from "../application";
import pomelo = require("../pomelo");

export function invokeCallback(cb: Function, ...args: any[]) {
  if (typeof cb === "function") {
    let len = arguments.length;
    if (len == 1) {
      return cb();
    }

    if (len == 2) {
      return cb(arguments[1]);
    }

    if (len == 3) {
      return cb(arguments[1], arguments[2]);
    }

    if (len == 4) {
      return cb(arguments[1], arguments[2], arguments[3]);
    }

    let args = Array(len - 1);
    for (let i = 1; i < len; i++) args[i - 1] = arguments[i];
    cb.apply(null, args);
  }
}

export function size(obj: any): number {
  let count = 0;
  for (let i in obj) {
    if (obj.hasOwnProperty(i) && typeof obj[i] !== "function") {
      count++;
    }
  }
  return count;
}

export function endsWith(str: string, suffix: string): boolean {
  if (
    typeof str !== "string" ||
    typeof suffix !== "string" ||
    suffix.length > str.length
  ) {
    return false;
  }
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

export function startWith(str: string, prefix: string): boolean {
  if (
    typeof str !== "string" ||
    typeof prefix !== "string" ||
    prefix.length > str.length
  ) {
    return false;
  }
  return str.indexOf(prefix) === 0;
}

export function arrayDiff(array1: Array<any>, array2: Array<any>) {
  let o = {} as { [idx: string]: boolean };
  for (let i = 0, len = array2.length; i < len; i++) {
    o[array2[i]] = true;
  }

  let result = [];
  for (let i = 0, len = array1.length; i < len; i++) {
    let v = array1[i];
    if (o[v]) continue;
    result.push(v);
  }
  return result;
}

export function format(date: Date, format: string) {
  format = format || "MMddhhmm";
  let o: { [idx: string]: number } = {
    "M+": date.getMonth() + 1, //month
    "d+": date.getDate(), //day
    "h+": date.getHours(), //hour
    "m+": date.getMinutes(), //minute
    "s+": date.getSeconds(), //second
    "q+": Math.floor((date.getMonth() + 3) / 3), //quarter
    S: date.getMilliseconds() //millisecond
  };

  if (/(y+)/.test(format)) {
    format = format.replace(
      RegExp.$1,
      (date.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  }

  for (let k in o) {
    if (new RegExp("(" + k + ")").test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1
          ? o[k].toString()
          : ("00" + o[k]).substr(("" + o[k]).length)
      );
    }
  }
  return format;
}

export function hasChineseChar(str: string): boolean {
  if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
    return true;
  } else {
    return false;
  }
}

export function unicodeToUtf8(str: string): string {
  let i, len, ch;
  let utf8Str = "";
  len = str.length;
  for (i = 0; i < len; i++) {
    ch = str.charCodeAt(i);

    if (ch >= 0x0 && ch <= 0x7f) {
      utf8Str += str.charAt(i);
    } else if (ch >= 0x80 && ch <= 0x7ff) {
      utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1f));
      utf8Str += String.fromCharCode(0x80 | (ch & 0x3f));
    } else if (ch >= 0x800 && ch <= 0xffff) {
      utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xf));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | (ch & 0x3f));
    } else if (ch >= 0x10000 && ch <= 0x1fffff) {
      utf8Str += String.fromCharCode(0xf0 | ((ch >> 18) & 0x7));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | (ch & 0x3f));
    } else if (ch >= 0x200000 && ch <= 0x3ffffff) {
      utf8Str += String.fromCharCode(0xf8 | ((ch >> 24) & 0x3));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | (ch & 0x3f));
    } else if (ch >= 0x4000000 && ch <= 0x7fffffff) {
      utf8Str += String.fromCharCode(0xfc | ((ch >> 30) & 0x1));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3f));
      utf8Str += String.fromCharCode(0x80 | (ch & 0x3f));
    }
  }
  return utf8Str;
}

export function ping(host: string, cb: (ret:boolean)=>void) {
  if (!isLocal(host)) {
    let cmd = "ping -w 15 " + host;
    exec(cmd, function(err, stdout, stderr) {
      if (!!err) {
        cb(false);
        return;
      }
      cb(true);
    });
  } else {
    cb(true);
  }
}

export function checkPort(
  server: { host: string; port?: number|string; clientPort?: number|string },
  cb: Function
) {
  if (!server.port && !server.clientPort) {
    invokeCallback(cb, "leisure");
    return;
  }
  let port = server.port || server.clientPort;
  let host = server.host;
  let generateCommand = function(host: string, port: number | string) {
    let cmd;
    let ssh_params : any = pomelo.app.get(Constants.RESERVED.SSH_CONFIG_PARAMS);
    if (!!ssh_params && Array.isArray(ssh_params)) {
      ssh_params = ssh_params.join(" ");
    } else {
      ssh_params = "";
    }
    if (!isLocal(host)) {
      cmd = util.format(
        "ssh %s %s \"netstat -an|awk '{print $4}'|grep %s|wc -l\"",
        host,
        ssh_params,
        port
      );
    } else {
      cmd = util.format("netstat -an|awk '{print $4}'|grep %s|wc -l", port);
    }
    return cmd;
  };
  let cmd1 = generateCommand(host, port!);
  let child = exec(cmd1, function(err, stdout, stderr) {
    if (err) {
      logger.error("command %s execute with error: %j", cmd1, err.stack);
      invokeCallback(cb, "error");
    } else if (stdout.trim() !== "0") {
      invokeCallback(cb, "busy");
    } else {
      port = server.clientPort;
      let cmd2 = generateCommand(host, port!);
      exec(cmd2, function(err, stdout, stderr) {
        if (err) {
          logger.error("command %s execute with error: %j", cmd2, err.stack);
          invokeCallback(cb, "error");
        } else if (stdout.trim() !== "0") {
          invokeCallback(cb, "busy");
        } else {
          invokeCallback(cb, "leisure");
        }
      });
    }
  });
}

export function isLocal(host: string) {
  let app = require("../pomelo").app;
  if (!app) {
    return (
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "0.0.0.0" ||
      inLocal(host)
    );
  } else {
    return (
      host === "127.0.0.1" ||
      host === "localhost" ||
      host === "0.0.0.0" ||
      inLocal(host) ||
      host === app.master.host
    );
  }
}

export function extend(origin: any, add: any): any {
  if (!add || !isObject(add)) return origin;

  let keys = Object.keys(add);
  let i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

export function headHandler(headBuffer: Buffer) {
  let len = 0;
  for (let i = 1; i < 4; i++) {
    if (i > 1) {
      len <<= 8;
    }
    len += headBuffer.readUInt8(i);
  }
  return len;
}

function inLocal(host: string) {
  for (let index in localIps) {
    if (host === localIps[index]) {
      return true;
    }
  }
  return false;
}

let localIps = (function() {
  let ifaces = os.networkInterfaces();
  let ips: string[] = [];
  let func = function(details: any) {
    if (details.family === "IPv4") {
      ips.push(details.address);
    }
  };
  for (let dev in ifaces) {
    ifaces[dev].forEach(func);
  }
  return ips;
})();

export function isObject(arg: any) {
  return typeof arg === "object" && arg !== null;
}
