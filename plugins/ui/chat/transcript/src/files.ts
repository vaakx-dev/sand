import { fileViewer } from '@sand/file-viewer/contract'
import type { MarkdownFiles } from '@sand/markdown/contract'
import type { TranscriptContext } from './context'

export const replyFiles = (ctx: TranscriptContext, thread: string): MarkdownFiles => ({
  link: (target, label) => ctx.get(fileViewer)?.files(thread).link(target, label),
  mention: (text, label) => ctx.get(fileViewer)?.files(thread).mention(text, label),
})

export const fileOpener = (ctx: TranscriptContext, thread: string) => () => {
  const viewer = ctx.get(fileViewer)
  return viewer && ((path: string) => viewer.open(thread, path))
}
