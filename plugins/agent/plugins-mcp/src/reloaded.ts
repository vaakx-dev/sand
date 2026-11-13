import { listFailed, type SwapResult } from '@sand/host-runtimes/contract'

const moved = 'sand reloaded its plugins into a fresh runtime. After this batch of tool calls your turn moves there and carries on with the new tools.'

const reloadNote = ({ swapped, failed, error }: SwapResult) => {
  if (!swapped) return `The fresh runtime did not start: ${error}. You carry on in the old runtime with the plugins and tools you had.`
  if (!failed.length) return moved
  return `${moved} These plugins did not load: ${listFailed(failed)}`
}

export { reloadNote }
