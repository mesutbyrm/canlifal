const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
module.exports = function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})', {filename:file})(key => {
    if (Object.prototype.hasOwnProperty.call(deps,key)) return deps[key]
    if (key === 'crypto') return require('node:crypto')
    throw Error('Unmocked dependency: '+key)
  }, module, module.exports)
  return module.exports
}
