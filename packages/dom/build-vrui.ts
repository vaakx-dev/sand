import { join } from 'node:path'

const root = join(import.meta.dir, 'node_modules', '@vaakx-dev', 'vrui')
const dist = join(root, 'dist')

const built = await Bun.build({ entrypoints: [join(root, 'src', 'index.ts')], outdir: dist, format: 'esm', target: 'browser', external: ['lucide'] })
if (!built.success) throw new AggregateError(built.logs, 'Could not build vrui')

const types = Bun.spawnSync(['tsc', '-p', join(root, 'tsconfig.build.json'), '--outDir', dist], { stdout: 'inherit', stderr: 'inherit' })
if (types.exitCode) throw new Error('Could not build the vrui types')
