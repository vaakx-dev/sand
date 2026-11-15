import type { Kit } from '@sand/ui-kit/contract'
import { div, p, span } from '@vaakx-dev/vrui'
import type { FontNames } from './names'

interface Font {
  face: FontFace
  names: FontNames
  fallbackName: string
}

const SAMPLE = 'The quick brown fox jumps over the lazy dog.'
const SIZES = [14, 20, 30, 48]
const CHARACTERS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 !?&@#%(){}[]'].join('\n')

const section = (kit: Kit, title: string, ...children: Node[]) => div({ class: 'flex flex-col gap-3' }, kit.groupHeading(title), ...children)

const sizeRow = (kit: Kit, fontFamily: string, size: number) =>
  div({ class: 'flex flex-col gap-1 px-2' }, kit.metaLine(`${size} px`), p({ class: 'leading-tight text-neutral-100', style: { fontFamily, fontSize: size } }, SAMPLE))

const specimen = (kit: Kit, { face, names, fallbackName }: Font) => {
  const fontFamily = `"${face.family}"`
  const details = [names.style, names.version].filter(Boolean).join(' · ')
  return div(
    {
      class: 'flex flex-col gap-2 px-2 py-4 wrap-anywhere',
      onMount: () => {
        document.fonts.add(face)
        return () => document.fonts.delete(face)
      },
    },
    div(
      { class: 'flex flex-col gap-1 px-2' },
      p({ class: 'text-3xl text-neutral-100', style: { fontFamily } }, names.family ?? fallbackName),
      details ? kit.metaLine(details) : null,
    ),
    section(kit, 'Sizes', ...SIZES.map(size => sizeRow(kit, fontFamily, size))),
    section(kit, 'Characters', p({ class: 'px-2 text-2xl leading-snug whitespace-pre-line text-neutral-100', style: { fontFamily } }, CHARACTERS)),
    names.copyright ? span({ class: 'px-2 pt-4 text-xs text-neutral-500' }, names.copyright) : null,
  )
}

export { specimen }
