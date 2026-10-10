import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'

export interface Encoded {
  br: Uint8Array<ArrayBuffer>
  gzip: Uint8Array<ArrayBuffer>
}

const brotli = promisify(brotliCompress)
const gzipped = promisify(gzip)

export const compress = async (script: string): Promise<Encoded> => {
  const source = Buffer.from(script)
  const [br, gz] = await Promise.all([
    brotli(source, {
      params: {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
      },
    }),
    gzipped(source, { level: constants.Z_BEST_COMPRESSION }),
  ])
  return { br: new Uint8Array(br), gzip: new Uint8Array(gz) }
}
