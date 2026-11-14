export const trimSlash = (url: string) => url.replace(/\/+$/, '')

export const libraryRoot = (route: string, version: string) => `${route}${version}/`
