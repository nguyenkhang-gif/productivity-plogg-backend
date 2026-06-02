// File global is only available natively in Node.js 20+.
// epub-gen-memory references it at module load time, so this must run first.
if (typeof globalThis.File === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.File = require('buffer').File;
}
