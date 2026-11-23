interface Field {
  number: number
  value: number | Uint8Array
}

const VARINT = 0
const FIXED64 = 1
const LENGTH_DELIMITED = 2
const FIXED32 = 5
const FIXED64_BYTES = 8
const FIXED32_BYTES = 4
const VARINT_PAYLOAD = 0x7f
const VARINT_MORE = 0x80
const VARINT_PAYLOAD_BITS = 7
const WIRE_TYPE_MASK = 7
const WIRE_TYPE_BITS = 3

class Message {
  private readonly fields: Field[] = []

  constructor(bytes: Uint8Array) {
    let position = 0
    const varint = () => {
      let value = 0
      for (let scale = 1; ; scale *= 2 ** VARINT_PAYLOAD_BITS) {
        const byte = bytes[position++]
        if (byte === undefined) throw new Error('Truncated protobuf message')
        value += (byte & VARINT_PAYLOAD) * scale
        if (!(byte & VARINT_MORE)) return value
      }
    }
    while (position < bytes.length) {
      const tag = varint()
      const number = Math.floor(tag / 2 ** WIRE_TYPE_BITS)
      const wireType = tag & WIRE_TYPE_MASK
      if (wireType === VARINT) this.fields.push({ number, value: varint() })
      else if (wireType === LENGTH_DELIMITED) {
        const length = varint()
        this.fields.push({ number, value: bytes.subarray(position, position + length) })
        position += length
      } else if (wireType === FIXED64) position += FIXED64_BYTES
      else if (wireType === FIXED32) position += FIXED32_BYTES
      else throw new Error(`Unsupported protobuf wire type ${wireType}`)
    }
  }

  int(number: number): number | undefined {
    const value = this.fields.find(field => field.number === number)?.value
    return typeof value === 'number' ? value : undefined
  }

  text(number: number): string | undefined {
    const value = this.fields.find(field => field.number === number)?.value
    return value instanceof Uint8Array ? new TextDecoder().decode(value) : undefined
  }

  child(number: number): Message | undefined {
    return this.children(number)[0]
  }

  children(number: number): Message[] {
    return this.fields.flatMap(field => (field.number === number && field.value instanceof Uint8Array ? [new Message(field.value)] : []))
  }
}

export { Message }
