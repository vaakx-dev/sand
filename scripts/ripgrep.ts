import { ensureRipgrep } from '@sand/boot/build'
import { resolve } from 'node:path'

await ensureRipgrep(resolve(import.meta.dir, '..'))
