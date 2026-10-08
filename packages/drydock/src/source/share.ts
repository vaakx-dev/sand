const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

const loaders: Record<string, 'ts' | 'tsx' | 'js' | 'jsx'> = {
  ts: 'ts',
  mts: 'ts',
  cts: 'ts',
  tsx: 'tsx',
  js: 'js',
  mjs: 'js',
  cjs: 'js',
  jsx: 'jsx',
}

export const share = (modules: Record<string, string>) => {
  const names = Object.keys(modules).map(escape).join('|')
  const pattern = new RegExp(`((?:from|import|require)\\s*\\(?\\s*)(['"])(${names})\\2`, 'g')
  Bun.plugin({
    name: 'drydock-share',
    setup(build) {
      build.onLoad({ filter: /^(?!.*[\\/]node_modules[\\/]).*\.[cm]?[jt]sx?$/ }, async ({ path }) => {
        const source = await Bun.file(path).text()
        const contents = source.replace(
          pattern,
          (_match, lead: string, quote: string, name: string) => `${lead}${quote}${modules[name]!.replaceAll('\\', '/')}${quote}`,
        )
        return { contents, loader: loaders[path.split('.').pop() ?? ''] ?? 'ts' }
      })
    },
  })
}
