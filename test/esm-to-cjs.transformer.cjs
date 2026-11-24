const crypto = require('crypto');
const fs = require('fs');
const ts = require('typescript');

const self = fs.readFileSync(__filename, 'utf8');

module.exports = {
  getCacheKey(sourceText, sourcePath) {
    return crypto
      .createHash('sha1')
      .update(self)
      .update(sourcePath)
      .update(sourceText)
      .digest('hex');
  },
  process(sourceText, sourcePath) {
    const { outputText } = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        allowJs: true,
        esModuleInterop: true,
      },
    });
    return { code: outputText };
  },
};
