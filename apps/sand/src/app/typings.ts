import { isFolder } from '@sand/util/fs'
import { join } from 'node:path'
import { builtins } from './loader'

const slashes = (path: string) => path.replaceAll('\\', '/')

const typesOf = (file: string) => slashes(file).replace(/\.js$/, '.d.ts')

const tsconfig = (modules: Record<string, string>) => ({
  compilerOptions: {
    target: 'ESNext',
    module: 'Preserve',
    moduleResolution: 'bundler',
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    typeRoots: [slashes(join(builtins, '..', 'node_modules', '@types'))],
    types: ['bun'],
    paths: Object.fromEntries(Object.entries(modules).map(([name, file]) => [name, [typesOf(file)]])),
  },
})

export const writeTypings = async (folder: string, modules: Record<string, string>) => {
  if (!(await isFolder(folder))) return
  const file = Bun.file(join(folder, 'tsconfig.json'))
  const text = `${JSON.stringify(tsconfig(modules), null, 2)}\n`
  if ((await file.exists()) && (await file.text()) === text) return
  await Bun.write(file, text)
}
