import { wire } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { panel } from '@sand/panel/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { type FileViewer, fileUrl, fileViewer, filesChanged, filesFind, filesShow, type FoundFile, type OpenFile } from '../contract'
import { builtinFormats, textFormat } from './builtin'
import { formatRegistry } from './formats'
import { linkFor } from './link'
import { fileLike, isFileTarget } from './mention'
import { pictureStage } from './picture'
import { openFiles } from './state'
import { fileView, rendered } from './view'

const TAB = 'file'


const besideFile = (path: string, target: string) => (/^(?:[\\/~]|[a-z]:)/i.test(target) ? target : `${path.replace(/[^\\/]*$/, '')}${target}`)

export default definePlugin({
  name: 'file-viewer-web',
  description: "Opens the files a thread mentions in the side panel's File tab: text, code, Markdown, images, audio and video, and the formats add-ons bring",
  inject: { wire, kit, panel, shell },
  apply(ctx) {
    const parts = { kit: ctx.kit, markdown: () => ctx.get(markdown) }
    const formats = formatRegistry(textFormat(parts))
    const files = openFiles((thread, mention) => ctx.wire.call(filesFind, { thread, mention }))

    const open = (thread: string, mention: string) => {
      void files.open(thread, mention)
      ctx.panel.show(TAB)
    }

    const download = async (file: FoundFile) => {
      const response = await ctx.wire.fetch(fileUrl(file))
      if (!response.ok) throw new Error(`the server answered ${response.status}`)
      return response.blob()
    }

    const opened = (thread: string, file: FoundFile): OpenFile => {
      let loading: Promise<Blob> | undefined
      const blob = () => (loading ??= download(file))
      return {
        ...file,
        blob,
        bytes: async () => (await blob()).bytes(),
        content: async () => (await blob()).text(),
        link: (target, label) => (isFileTarget(target) ? linkFor(ctx.kit, label, target, () => open(thread, besideFile(file.path, target))) : undefined),
      }
    }

    const viewer: FileViewer = {
      open,
      files: thread => ({
        link: (target, label) => (isFileTarget(target) ? linkFor(ctx.kit, label, target, () => open(thread, target)) : undefined),
        mention: (text, label) => (fileLike(text, formats.known) ? linkFor(ctx.kit, [label], text, () => open(thread, text)) : undefined),
      }),
      format: formats.add,
      render: file => rendered({ ctx, formats }, file),
      picture: pictureStage,
    }

    ctx.effect(() => joinDisposers(...builtinFormats(parts).map(formats.add)))
    ctx.provide(fileViewer, viewer)
    ctx.effect(() =>
      ctx.panel.tab({
        id: TAB,
        label: 'File',
        icon: 'file-text',
        order: 30,
        shows: subject => Boolean(files.of(subject.session)),
        render: subject => fileView({ ctx, shell: ctx.shell, formats, files, opened }, { thread: () => subject().session, cwd: () => subject().cwd }),
      }),
    )
    ctx.effect(() => ctx.wire.on(filesShow, ({ thread, path }) => open(thread, path)))
    ctx.effect(() => ctx.wire.on(filesChanged, files.changed))
  },
})
