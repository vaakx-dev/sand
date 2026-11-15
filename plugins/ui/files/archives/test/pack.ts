interface TarFile {
  name: string
  content?: string
  type?: string
  prefix?: string
}

const encoder = new TextEncoder()

const concat = (parts: Uint8Array[]) => {
  const whole = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  parts.reduce((at, part) => {
    whole.set(part, at)
    return at + part.length
  }, 0)
  return whole
}

const octal = (value: number, width: number) => value.toString(8).padStart(width - 1, '0')

const tarHeader = ({ name, size, type, prefix = '' }: { name: string; size: number; type: string; prefix?: string }) => {
  const block = new Uint8Array(512)
  const write = (at: number, text: string) => block.set(encoder.encode(text), at)
  write(0, name)
  write(100, octal(0o644, 8))
  write(124, octal(size, 12))
  write(136, octal(1_700_000_000, 12))
  write(148, '        ')
  write(156, type)
  write(257, 'ustar\u000000')
  write(345, prefix)
  const sum = block.reduce((total, byte) => total + byte, 0)
  write(148, `${octal(sum, 7)}\u0000`)
  return block
}

const padded = (data: Uint8Array) => concat([data, new Uint8Array((512 - (data.length % 512)) % 512)])

const tar = (files: TarFile[]) =>
  concat([
    ...files.flatMap(({ name, content = '', type = '0', prefix }) => {
      const data = encoder.encode(content)
      return [tarHeader({ name, size: data.length, type, prefix }), padded(data)]
    }),
    new Uint8Array(1024),
  ])

const paxRecord = (key: string, value: string) => {
  const body = ` ${key}=${value}\n`
  let length = body.length
  while (String(length).length + body.length !== length) length++
  return `${length}${body}`
}

export { paxRecord, tar }
