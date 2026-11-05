import { Glob } from 'bun'
import { dirname, join, relative, resolve } from 'node:path'

interface Workspace {
  name: string
  dir: string
  plugin: boolean
  exports: Record<string, string>
  dependencies: string[]
}

const root = resolve(import.meta.dir, '..')

const scan = (pattern: string, cwd: string) => Array.fromAsync(new Glob(pattern).scan({ cwd, absolute: true }), file => resolve(file))

const readWorkspace = async (manifest: string): Promise<Workspace> => {
  const { name, sand, exports = {}, dependencies = {} } = await Bun.file(manifest).json()
  return { name, dir: dirname(manifest), plugin: Boolean(sand), exports, dependencies: Object.keys(dependencies).filter(dep => dep.startsWith('@sand/')) }
}

const readWorkspaces = async () => {
  const { workspaces } = await Bun.file(join(root, 'package.json')).json()
  const manifests = await Promise.all(workspaces.map((pattern: string) => scan(`${pattern}/package.json`, root)))
  return Promise.all(manifests.flat().map(readWorkspace))
}

const specifiers = (source: string) => [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(match => match[1]!)

const stronglyConnected = (edges: Map<string, string[]>) => {
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const groups: string[][] = []
  const visit = (file: string) => {
    index.set(file, index.size)
    low.set(file, index.get(file)!)
    stack.push(file)
    for (const next of edges.get(file)!) {
      if (!index.has(next)) visit(next)
      if (stack.includes(next)) low.set(file, Math.min(low.get(file)!, low.get(next)!))
    }
    if (low.get(file) === index.get(file)) groups.push(stack.splice(stack.indexOf(file)))
  }
  for (const file of edges.keys()) if (!index.has(file)) visit(file)
  return groups
}

const workspaces = await readWorkspaces()
const byName = new Map(workspaces.map(workspace => [workspace.name, workspace]))
const owners = new Map<string, Workspace>()
for (const workspace of workspaces) for (const file of await scan('src/**/*.{ts,tsx}', workspace.dir)) owners.set(file, workspace)

const target = (from: string, specifier: string) => {
  if (specifier.startsWith('.')) {
    const path = resolve(dirname(from), specifier)
    return [path, `${path}.ts`, `${path}.tsx`, join(path, 'index.ts'), join(path, 'index.tsx')].find(file => owners.has(file))
  }
  const [scope, base, ...rest] = specifier.split('/')
  const workspace = byName.get(`${scope}/${base}`)
  const file = workspace?.exports[['.', ...rest].join('/')]
  return workspace && file ? resolve(workspace.dir, file) : undefined
}

const edges = new Map<string, string[]>()
const byPath: string[] = []
for (const [file, workspace] of owners) {
  const targets: string[] = []
  for (const specifier of specifiers(await Bun.file(file).text())) {
    const found = target(file, specifier)
    if (!found || !owners.has(found)) continue
    targets.push(found)
    if (specifier.startsWith('.') && owners.get(found) !== workspace) byPath.push(`${relative(root, file)} imports ${specifier} from another package by path`)
  }
  edges.set(file, targets)
}

const imported = (workspace: Workspace) =>
  new Set([...edges].filter(([file]) => owners.get(file) === workspace).flatMap(([, targets]) => targets.map(file => owners.get(file)!.name)))

const ownerName = (file: string) => owners.get(file)!.name
const crossing = (group: string[]) =>
  group.flatMap(file => edges.get(file)!.filter(next => group.includes(next) && ownerName(next) !== ownerName(file)).map(next => `  ${relative(root, file)} → ${relative(root, next)}`))

const exported = (workspace: Workspace) =>
  workspace.plugin
    ? Object.keys(workspace.exports)
        .filter(key => !key.endsWith('/contract'))
        .map(key => `${workspace.name} exports ${key}; a plugin exports only its contract`)
    : []

const unused = (workspace: Workspace) => {
  const used = imported(workspace)
  return workspace.dependencies.filter(dep => !used.has(dep)).map(dep => `${workspace.name} depends on ${dep} but never imports it`)
}

const cycles = stronglyConnected(edges)
  .map(crossing)
  .filter(lines => lines.length)
  .map(lines => `import cycle across packages:\n${lines.join('\n')}`)

const problems = [...byPath, ...workspaces.flatMap(workspace => [...exported(workspace), ...unused(workspace)]), ...cycles]
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
