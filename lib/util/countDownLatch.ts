export class CountDownLatch {
  private timerId: any;
  constructor(
    private count: number,
    opts: { timeout?: number },
    private cb: Function
  ) {
    if (opts.timeout) {
      this.timerId = setTimeout(() => {
        this.cb(true);
      }, opts.timeout);
    }
  }

  done() {
    if (this.count <= 0) {
      throw new Error("illegal state.");
    }

    this.count--;
    if (this.count === 0) {
      if (this.timerId) {
        clearTimeout(this.timerId);
      }
      this.cb();
    }
  }
}

export function createCountDownLatch(
  count: number,
  opts: { timeout?: number } | null | undefined,
  cb: Function
) {
  if (!count || count <= 0) {
    throw new Error("count should be positive.");
  }

  if (!cb && typeof opts === "function") {
    cb = opts;
    opts = {};
  }

  if (typeof cb !== "function") {
    throw new Error("cb should be a function.");
  }

  return new CountDownLatch(count, opts, cb);
}
