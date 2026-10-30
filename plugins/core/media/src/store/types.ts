const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
}

const served: Record<string, string> = {
  ...Object.fromEntries(Object.entries(extensions).map(([type, extension]) => [extension, type])),
  txt: 'text/plain; charset=utf-8',
}

export const isText = (mediaType: string) => mediaType.startsWith('text/')

export const extensionOf = (mediaType: string) => extensions[mediaType] ?? (isText(mediaType) ? 'txt' : 'bin')

export const storedExtensions = [...Object.keys(served), 'bin']

export const servedType = (extension: string) => served[extension] ?? 'application/octet-stream'
