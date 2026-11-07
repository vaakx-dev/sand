const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const step = 30_000
const digits = 6

const decode = (base32: string) => {
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const char of base32) {
    value = ((value << 5) | alphabet.indexOf(char)) & 0xffff
    bits += 5
    if (bits < 8) continue
    bits -= 8
    bytes.push((value >>> bits) & 0xff)
  }
  return Uint8Array.from(bytes)
}

export const totpSecret = (given: string) => {
  const secret = given.startsWith('otpauth://') ? (URL.parse(given)?.searchParams.get('secret') ?? '') : given
  const clean = secret.replace(/[\s=-]/g, '').toUpperCase()
  if (!/^[A-Z2-7]{16,}$/.test(clean)) throw new Error("That authenticator secret isn't a base32 key or an otpauth:// link")
  return clean
}

export const totpCode = (secret: string, at = Date.now()) => {
  const counter = new DataView(new ArrayBuffer(8))
  counter.setBigUint64(0, BigInt(Math.floor(at / step)))
  const mac = new Bun.CryptoHasher('sha1', decode(secret)).update(counter.buffer).digest()
  const offset = mac.readUInt8(mac.length - 1) & 0xf
  const binary = mac.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** digits).padStart(digits, '0')
}
