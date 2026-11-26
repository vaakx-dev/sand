interface Link {
  title: string
  address: string
}

const WEB_ADDRESS = /https?:\/\/\S+/

const firstLine = (text: string) => text.trim().split('\n', 1)[0]?.trim() ?? ''

const linkOf = (text: string): Link | undefined => {
  const found = WEB_ADDRESS.exec(text)?.[0]
  const url = found && URL.parse(found)
  if (!found || !url) return undefined
  const address = `${url.host}${url.pathname}`.replace(/\/$/, '')
  return { title: firstLine(text.replace(found, '')) || address, address }
}

export { firstLine, linkOf, type Link }
