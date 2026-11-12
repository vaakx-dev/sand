import { isRecord } from '@sand/util'
import { readManifest } from '@sand/util/release'
import { dirname, relative, resolve, sep } from 'node:path'
import type { Workspace } from './split'

interface Stub {
  files: string[]
  manifest: Uint8Array
  workspace: Workspace
}

const transpilers = { ts: new Bun.Transpiler({ loader: 'ts' }), tsx: new Bun.Transpiler({ loader: 'tsx' }) }

const relativeImport = (path: string) => path.startsWith('./') || path.startsWith('../')

const packageName = (path: string) => path.split('/').slice(0, path.startsWith('@') ? 2 : 1).join('/')

const importsOf = async (file: string) => {
  const transpiler = file.endsWith('x') ? transpilers.tsx : transpilers.ts
  return transpiler.scanImports(await Bun.file(file).text()).map(found => found.path)
}

const contractFiles = async (entries: string[]) => {
  const files = new Set<string>()
  const packages = new Set<string>()
  const visit = async (file: string): Promise<void> => {
    if (files.has(file)) return
    files.add(file)
    for (const path of await importsOf(file)) {
      if (relativeImport(path)) await visit(Bun.resolveSync(path, dirname(file)))
      else packages.add(packageName(path))
    }
  }
  for (const entry of entries) await visit(entry)
  return { files: [...files], packages }
}

const exportedFiles = (dir: string, exports: unknown) =>
  Object.values(isRecord(exports) ? exports : {})
    .filter(file => typeof file === 'string')
    .map(file => resolve(dir, file))

const appPath = (workspace: Workspace, file: string) => `${workspace.path}/${relative(workspace.dir, file).split(sep).join('/')}`

const contractStub = async (workspace: Workspace): Promise<Stub> => {
  const { name, version, description, type, exports, dependencies } = (await readManifest(workspace.dir)) ?? {}
  const { files, packages } = await contractFiles(exportedFiles(workspace.dir, exports))
  const used = Object.entries(isRecord(dependencies) ? dependencies : {}).filter(([dependency]) => packages.has(dependency))
  const manifest = { name, version, description, type, exports, dependencies: Object.fromEntries(used) }
  return {
    files: files.map(file => appPath(workspace, file)),
    manifest: new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
    workspace: { ...workspace, dependencies: used.map(([dependency]) => dependency) },
  }
}

export { contractStub, type Stub }
