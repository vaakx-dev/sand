import { scanPlugin } from '@sand/plugin-files'

export const contentHash = async (path: string) => (await scanPlugin(path)).hash
