// File global is only available natively in Node.js 20+.
// epub-gen-memory references it at module load time, so this must run first.
if (typeof globalThis.File === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.File = require('buffer').File;
}

// JSON.stringify không biết serialize BigInt (ném TypeError → 500). Permission
// bitmask (bigint) ở tầng wire luôn hiểu là string, nên convert mặc định.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
