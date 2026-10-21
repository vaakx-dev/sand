import { scanPlugin } from '@sand/host-plugin-library/files'

export const contentHash = async (path: string) => (await scanPlugin(path)).hash
