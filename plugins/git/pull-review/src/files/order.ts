import { comparePaths } from '@sand/util'

const lockFiles = new Set([
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'cargo.lock',
  'go.sum',
  'poetry.lock',
  'uv.lock',
  'pipfile.lock',
  'gemfile.lock',
  'composer.lock',
  'flake.lock',
  'pubspec.lock',
  'podfile.lock',
])

const generatedPath = [
  /(^|\/)(dist|build|out|vendor|node_modules|__generated__|generated)\//,
  /\.(min\.js|min\.css|map|snap)$/,
  /\.generated\.\w+$/,
  /(\.pb\.go|_pb2\.py|\.g\.dart)$/,
]

const testPath = [/(^|\/)(tests?|__tests__|specs?|e2e)\//, /\.(test|spec)\.\w+$/, /_test\.\w+$/, /(^|\/)test_[^/]+\.py$/]

const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1).toLowerCase()

const rank = (path: string) => {
  const lower = path.toLowerCase()
  if (lockFiles.has(fileName(path)) || generatedPath.some(pattern => pattern.test(lower))) return 2
  if (testPath.some(pattern => pattern.test(lower))) return 1
  return 0
}

export const reviewOrder = <T extends { path: string }>(files: T[]) =>
  files
    .map(file => ({ file, rank: rank(file.path) }))
    .sort((a, b) => a.rank - b.rank || comparePaths(a.file.path, b.file.path))
    .map(({ file }) => file)
