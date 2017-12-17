import fs = require('fs');
import path = require('path');
import { DIR } from './constants';

export function getSysRemotePath(role:string) {
  let p = path.join(__dirname, '/../common/remote/', role);
  return fs.existsSync(p) ? p : null;
}

export function getUserRemotePath(appBase:string, serverType:string) {
  let p = path.join(appBase, '/app/servers/', serverType, DIR.REMOTE);
  return fs.existsSync(p) ? p : null;
}

export function getCronPath(appBase:string, serverType:string) {
  let p = path.join(appBase, '/app/servers/', serverType, DIR.CRON);
  return fs.existsSync(p) ? p : null;
}

export function listUserRemoteDir(appBase:string) {
  let base = path.join(appBase, '/app/servers/');
  let files = fs.readdirSync(base);
  return files.filter((fn)=> {
    if(fn.charAt(0) === '.') {
      return false;
    }

    return fs.statSync(path.join(base, fn)).isDirectory();
  });
}

export function remotePathRecord(namespace:string, serverType:string, path:string) {
  return {namespace: namespace, serverType: serverType, path: path};
}

export function getHandlerPath(appBase:string, serverType:string) {
  let p = path.join(appBase, '/app/servers/', serverType, DIR.HANDLER);
  return fs.existsSync(p) ? p : null;
}

export function getScriptPath(appBase:string) {
  return path.join(appBase, DIR.SCRIPT);
}

export function getLogPath(appBase:string) {
  return path.join(appBase, DIR.LOG);
}
