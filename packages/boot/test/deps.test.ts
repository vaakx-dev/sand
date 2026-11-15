import { afterAll, expect, test } from 'bun:test'
import { moduleFiles } from '@sand/util/release'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runtimeDeps } from '../src/build'

const temp = await mkdtemp(join(tmpdir(), 'sand-deps-'))

afterAll(() => rm(temp, { recursive: true, force: true }))

const writePackage = async (dir: string, manifest: Record<string, unknown>) => {
  await Bun.write(join(dir, 'package.json'), JSON.stringify({ main: 'index.js', ...manifest }))
  await Bun.write(join(dir, 'index.js'), `module.exports = ${JSON.stringify(manifest.version)}\n`)
}

const versionSeenFrom = async (from: string, name: string) => {
  const entry = Bun.resolveSync(name, from)
  const manifest: { version: string } = await Bun.file(join(dirname(entry), 'package.json')).json()
  return manifest.version
}

test('each package keeps the version it depends on when two versions of a library are needed', async () => {
  const source = join(temp, 'source')
  await Bun.write(join(source, 'package.json'), JSON.stringify({ name: 'root', workspaces: ['app'] }))
  await writePackage(join(source, 'app'), { name: 'app', version: '0.0.0', dependencies: { x: '^1', y: '^1', z: '^1' } })
  await writePackage(join(source, 'node_modules', 'x'), { name: 'x', version: '1.0.0' })
  await writePackage(join(source, 'node_modules', 'z'), { name: 'z', version: '1.0.0' })
  await writePackage(join(source, 'node_modules', 'y'), { name: 'y', version: '1.0.0', dependencies: { x: '^2' } })
  await writePackage(join(source, 'node_modules', 'y', 'node_modules', 'x'), { name: 'x', version: '2.0.0', dependencies: { z: '^2' } })
  await writePackage(join(source, 'node_modules', 'y', 'node_modules', 'x', 'node_modules', 'z'), { name: 'z', version: '2.0.0' })

  const deps = await runtimeDeps(source, { packages: [{ name: 'app', dir: join(source, 'app'), dependencies: ['x', 'y', 'z'] }] })
  const release = join(temp, 'release')
  for (const file of await moduleFiles(deps)) await Bun.write(join(release, ...file.path.split('/')), file.bytes)

  const nestedX = join(release, 'node_modules', 'y', 'node_modules', 'x')
  expect(await versionSeenFrom(release, 'x')).toBe('1.0.0')
  expect(await versionSeenFrom(release, 'z')).toBe('1.0.0')
  expect(await versionSeenFrom(join(release, 'node_modules', 'y'), 'x')).toBe('2.0.0')
  expect(await versionSeenFrom(nestedX, 'z')).toBe('2.0.0')
})

test('two workspace packages that need different versions of one library stop the build', async () => {
  const source = join(temp, 'direct')
  await Bun.write(join(source, 'package.json'), JSON.stringify({ name: 'root', workspaces: ['a', 'b'] }))
  await writePackage(join(source, 'a'), { name: 'a', version: '0.0.0', dependencies: { x: '^1' } })
  await writePackage(join(source, 'b'), { name: 'b', version: '0.0.0', dependencies: { x: '^2' } })
  await writePackage(join(source, 'node_modules', 'x'), { name: 'x', version: '1.0.0' })
  await writePackage(join(source, 'b', 'node_modules', 'x'), { name: 'x', version: '2.0.0' })

  const packages = [
    { name: 'a', dir: join(source, 'a'), dependencies: ['x'] },
    { name: 'b', dir: join(source, 'b'), dependencies: ['x'] },
  ]
  await expect(runtimeDeps(source, { packages })).rejects.toThrow('sand needs one version of x, found 1.0.0 and 2.0.0')
})
