export const socketUrl = (url: string, token: string) => `${url.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`

export const pageLink = (url: string, token: string) => `${url}/?token=${encodeURIComponent(token)}`
