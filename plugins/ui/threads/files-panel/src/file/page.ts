import type { Composer } from '@sand/composer/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { FileContent } from '@sand/project/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, effect, show, sig, type Sig } from '@vaakx-dev/vrui'
import { message, type FilesModel } from '../model'
import { bar, page, pathLine } from '../parts'
import { fileName } from '../paths'
import { fileBody } from './body'

export interface FileParts {
  kit: Kit
  model: FilesModel
  markdown(): Markdown | undefined
  writer: Sig<Composer | undefined>
}

type Read = { content: FileContent } | { error: string } | undefined

const mention = (writer: Composer, path: string) => {
  writer.insert(/\s/.test(path) ? `@"${path}" ` : `@${path} `)
  writer.focus()
}

export const filePage = ({ kit, model, markdown, writer }: FileParts, path: string) => {
  const { copyButton, headTitle, hint, icon, iconButton } = kit
  const read = sig<Read>(undefined)
  let latest = 0
  effect(() => {
    model.version.get()
    const ticket = ++latest
    model.read(path).then(
      content => ticket === latest && read.set({ content }),
      error => ticket === latest && read.set({ error: message(error) }),
    )
  })
  const text = () => {
    const value = read.get()
    return value && 'content' in value ? value.content.text : undefined
  }
  return page(
    bar(
      iconButton({ title: 'Back to files', onClick: () => model.opened.set(undefined) }, icon('back', 16)),
      headTitle(2, fileName(path)),
      iconButton({ title: 'Reload file', onClick: model.reload }, icon('reload', 16)),
      show(
        () => text() !== undefined,
        () => copyButton({ text: () => text() ?? '', label: 'Copy' }),
      ),
      dynamicChild(writer, found => found && iconButton({ title: 'Mention in message', onClick: () => mention(found, path) }, icon('message', 16))),
    ),
    pathLine(path),
    dynamicChild(read, value => {
      if (!value) return hint('Loading…')
      if ('error' in value) return hint(value.error)
      return fileBody(kit, value.content, path, markdown())
    }),
  )
}
