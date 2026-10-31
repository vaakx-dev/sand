export const pathspecFromInput = ['--pathspec-from-file=-', '--pathspec-file-nul']

export const pathInput = (paths: string[]) => paths.join('\0')

export const literalPaths = { GIT_LITERAL_PATHSPECS: '1' }
