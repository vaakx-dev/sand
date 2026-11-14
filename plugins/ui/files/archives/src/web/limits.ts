import { bytes } from '@sand/util'

const MB = 1024 * 1024

const MAX_ARCHIVE_BYTES = 100 * MB
const MAX_UNPACKED_BYTES = 256 * MB
const MAX_ENTRY_BYTES = 50 * MB
const MAX_ENTRIES = 10_000

const damaged = (detail: string) => new Error(`it's damaged: ${detail}`)

const tooManyEntries = () => new Error(`The archive has more than ${MAX_ENTRIES.toLocaleString('en')} entries, the most the viewer lists`)

const tooBigToUnpack = (size: number) => new Error(`It unpacks to ${bytes(size)}; the viewer opens files up to ${bytes(MAX_ENTRY_BYTES)} from an archive`)

export { MAX_ARCHIVE_BYTES, MAX_ENTRIES, MAX_ENTRY_BYTES, MAX_UNPACKED_BYTES, damaged, tooBigToUnpack, tooManyEntries }
