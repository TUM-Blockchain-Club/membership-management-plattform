import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')

// Execute the real route/modules, replacing only infrastructure boundaries.
export function load(file, deps = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in deps)) throw new Error(`Unexpected dependency: ${id}`)
    return deps[id]
  }, Response, Buffer, console, process, Error })
  return exports
}
