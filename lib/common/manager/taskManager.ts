const sequeue = require('seq-queue');
const queues:{[idx:string]:any} = {};

export const timeout = 3000;

export function addTask(key:string, fn:Function, ontimeout?:Function, timeout?:number) {
  var queue = queues[key];
  if(!queue) {
    queue = sequeue.createQueue(timeout);
    queues[key] = queue;
  }

  return queue.push(fn, ontimeout, timeout);
};

export function closeQueue(key:string, force:boolean = false) {
  if(!queues[key]) {
    // ignore illeagle key
    return;
  }

  queues[key].close(force);
  delete queues[key];
};

