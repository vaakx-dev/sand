const POLYNOMIAL = 0xedb88320

const tableOf = () =>
  Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? POLYNOMIAL ^ (value >>> 1) : value >>> 1
    return value
  })

let table: Uint32Array | undefined

const crc32 = (data: Uint8Array) => {
  table ??= tableOf()
  let crc = 0xffffffff
  for (let at = 0; at < data.length; at++) crc = table[(crc ^ data[at]!) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export { crc32 }
