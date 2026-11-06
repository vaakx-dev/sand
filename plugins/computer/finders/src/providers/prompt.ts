import type { UiElement } from '@sand/computers/contract'
import type { Size } from './answer'

const confidence = 'C is your confidence, from 0 to 1, that you picked the target.'

export const visionSystem = [
  'You find things on a screenshot for a program that will click them. Reply with one JSON object and nothing else:',
  '- {"x": X, "y": Y, "confidence": C}: the pixel coordinates of the centre of the target in the image, or',
  '- {"ref": "R", "confidence": C}: the ref of the listed element that is the target, when elements are listed, or',
  '- {"found": false}: when the target is not in the image.',
  confidence,
].join('\n')

export const elementSystem = [
  'You pick the element of a screen that a program should click. Reply with one JSON object and nothing else:',
  '- {"ref": "R", "confidence": C}: the ref of the element that is the target, or',
  '- {"found": false}: when no element is the target.',
  confidence,
].join('\n')

const px = (value: number, size: number) => Math.round(value * size)

const line = ({ ref, role, name, box }: UiElement, screen: Size) => {
  const edges = [px(box.left, screen.width), px(box.top, screen.height), px(box.right, screen.width), px(box.bottom, screen.height)]
  return [`[${ref}]`, role, name && JSON.stringify(name), `at ${edges.join(',')}`].filter(Boolean).join(' ')
}

const listed = (elements: UiElement[], screen: Size) =>
  elements.length
    ? [
        'Elements, as [ref] role "name" at left,top,right,bottom pixels. Numbered labels drawn on the image are these refs. Answer with a ref.',
        ...elements.map(element => line(element, screen)),
      ]
    : []

export const question = (target: string, screen: Size, elements: UiElement[]) =>
  [`The screen is ${screen.width}×${screen.height} pixels.`, `Target: ${target}`, ...listed(elements, screen)].join('\n')
