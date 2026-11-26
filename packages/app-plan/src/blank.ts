import { secretMark } from '@sand/chats/contract'

const markOnce = JSON.stringify(secretMark)

const markTwice = JSON.stringify(markOnce).slice(1, -1)

const blanked = (text: string, values: string[]) =>
  values.reduce((out, value) => {
    const once = JSON.stringify(value)
    const twice = JSON.stringify(once).slice(1, -1)
    return out.replaceAll(twice, markTwice).replaceAll(once, markOnce)
  }, text)

const blankFile = async (path: string, values: string[]) => {
  const text = await Bun.file(path).text()
  const out = blanked(text, values)
  if (out !== text) await Bun.write(path, out)
}

const blankFiles = async (paths: string[], values: string[]) => {
  await Promise.all(paths.map(path => blankFile(path, values)))
}

export { blankFiles }
