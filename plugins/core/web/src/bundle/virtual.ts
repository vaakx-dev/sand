import type { BunPlugin } from 'bun'
import type { Extension } from '../extensions/discover'

const describe = ({ id, builtin, enabled, provides, label, summary }: Extension) => ({ id, builtin, enabled, provides, label, summary })

export const manifestSource = (build: string, extensions: Extension[], bundled: Extension[], problems: string[]) =>
  [
    ...bundled.map((extension, index) => `import extension${index} from ${JSON.stringify(extension.entry)}`),
    `export const build = ${JSON.stringify(build)}`,
    `export const problems = ${JSON.stringify(problems)}`,
    `const plugins = { ${bundled.map((extension, index) => `${JSON.stringify(extension.id)}: extension${index}`).join(', ')} }`,
    `export const extensions = ${JSON.stringify(extensions.map(describe))}.map(info => ({ ...info, plugin: plugins[info.id] }))`,
  ].join('\n')

export const virtualModules = (manifest: string, shared: Record<string, string>): BunPlugin => ({
  name: 'sand-web',
  setup(build) {
    build.onResolve({ filter: /^sand:extensions$/ }, () => ({ path: 'sand:extensions', namespace: 'sand' }))
    build.onLoad({ filter: /.*/, namespace: 'sand' }, () => ({ contents: manifest, loader: 'ts' }))
    const names = Object.keys(shared).map(name => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
    build.onResolve({ filter: new RegExp(`^(${names.join('|')})$`) }, ({ path }) => ({ path: shared[path]! }))
  },
})
