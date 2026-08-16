// Shim CJS cho uuid (v14 là pure-ESM → jest CommonJS không load được).
// Chỉ cần v4 trong codebase; dùng crypto.randomUUID native.
const { randomUUID } = require('crypto');
module.exports = {
  v4: () => randomUUID(),
  NIL: '00000000-0000-0000-0000-000000000000',
};
