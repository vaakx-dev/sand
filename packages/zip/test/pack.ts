interface File {
  name: string
  content?: string
  deflate?: boolean
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

const zip = (files: File[]) => {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const { name, content = '', deflate = false } of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const packed = deflate ? Bun.deflateSync(data) : data
    const crc = Bun.hash.crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(8, deflate ? 8 : 0, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, packed.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(10, deflate ? 8 : 0, true)
    centralView.setUint16(14, 0x5a21, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, packed.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    locals.push(local, packed)
    centrals.push(central)
    offset += local.length + packed.length
  }
  const directory = concat(centrals)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, directory.length, true)
  endView.setUint32(16, offset, true)
  return concat([...locals, directory, end])
}

const centralAt = (archive: Uint8Array, index: number) => {
  const view = new DataView(archive.buffer)
  let at = view.getUint32(archive.length - 6, true)
  for (let skipped = 0; skipped < index; skipped++) at += 46 + view.getUint16(at + 28, true)
  return at
}

const tamperZip = (archive: Uint8Array, change: (view: DataView, central: (index: number) => number) => void) => {
  const copy = archive.slice()
  change(new DataView(copy.buffer), index => centralAt(copy, index))
  return copy
}

export { tamperZip, zip }
