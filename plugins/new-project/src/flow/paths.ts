import type { ProjectPlace } from '@sand/protocol'

const root = (dir: string, sep: string) => (!dir ? sep : /^[A-Za-z]:$/.test(dir) ? `${dir}${sep}` : dir)

export const split = (value: string, sep: string) => {
  const at = value.lastIndexOf(sep)
  return at < 0 ? { dir: undefined, leaf: value } : { dir: root(value.slice(0, at), sep), leaf: value.slice(at + 1) }
}

export const join = (dir: string, name: string, sep: string) => (dir.endsWith(sep) ? `${dir}${name}` : `${dir}${sep}${name}`)

export const short = (path: string, place: ProjectPlace) => (path.startsWith(place.home) ? `~${path.slice(place.home.length)}` : path)

export const absolute = (path: string, place: ProjectPlace) => (path === '~' || path.startsWith(`~${place.sep}`) ? `${place.home}${path.slice(1)}` : path)

export const leafName = (path: string, sep: string) => path.split(sep).filter(Boolean).at(-1) ?? path
