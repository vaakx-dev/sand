const windowsPath = /^([A-Za-z]:|[\\/]{2})/

const windowsKey = (path: string) => {
  const key = path.replaceAll('/', '\\').toLowerCase()
  return /^[a-z]:\\$/.test(key) ? key : key.replace(/\\+$/, '')
}

const posixKey = (path: string) => path.replace(/\/+/g, '/').replace(/(.)\/$/, '$1')

export const pathKey = (path: string) => (windowsPath.test(path) ? windowsKey(path) : posixKey(path))
