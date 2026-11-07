import { all, tabAt, type LocalTask } from '../task'
import { layout, shuffled } from './layout'

const drawings: Record<string, (color: string) => string> = {
  bicycle: color =>
    `<circle cx="55" cy="120" r="35" fill="none" stroke="#333" stroke-width="6"/><circle cx="185" cy="120" r="35" fill="none" stroke="#333" stroke-width="6"/><path d="M55 120 L100 60 L160 60 L185 120 M100 60 L120 120 L160 60 M90 45 L115 45 M150 45 L170 40" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>`,
  car: color => `<rect x="25" y="70" width="190" height="45" rx="10" fill="${color}"/><path d="M60 70 L85 40 L155 40 L180 70Z" fill="${color}"/><circle cx="70" cy="120" r="18" fill="#333"/><circle cx="170" cy="120" r="18" fill="#333"/>`,
  boat: color => `<path d="M20 110 L220 110 L190 140 L50 140Z" fill="${color}"/><path d="M120 20 L120 105 L190 105Z" fill="#eee" stroke="#333" stroke-width="3"/><path d="M0 145 Q60 135 120 145 T240 145" fill="none" stroke="#4a90d9" stroke-width="5"/>`,
  house: color => `<rect x="60" y="70" width="120" height="75" fill="${color}"/><path d="M45 75 L120 20 L195 75Z" fill="#8b4a2b"/><rect x="105" y="105" width="30" height="40" fill="#5a3a1a"/>`,
}

const colors: Record<string, string> = { red: '#d62828', blue: '#2a6fdb', green: '#2a9d3f', yellow: '#e9c46a' }

const photos = shuffled(Object.keys(drawings).flatMap(kind => Object.keys(colors).map(color => ({ kind, color })))).map((photo, index) => ({ ...photo, id: index + 1 }))

const wanted = photos.find(photo => photo.kind === 'bicycle' && photo.color === 'red')!

const svg = ({ kind, color, id }: (typeof photos)[number], size: number) =>
  `<svg role="img" aria-label="Photo ${id}" viewBox="0 0 240 160" width="${size}" height="${(size * 2) / 3}" style="background:#fff">${drawings[kind]!(colors[color]!)}</svg>`

const page = layout(
  'Photo gallery',
  `<header><b>Photo gallery</b></header><main><h1>Holiday photos</h1><div class="grid">${photos
    .map(photo => `<div class="card"><a href="#photo-${photo.id}" data-photo="${photo.id}">${svg(photo, 180)}</a><p>Photo ${photo.id}</p></div>`)
    .join('')}</div></main>
<div id="lightbox" style="position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center"><button type="button" id="close" style="position:absolute;top:16px;right:16px">Close</button><div id="big"></div></div>
<template id="photos">${photos.map(photo => `<div data-id="${photo.id}">${svg(photo, 900)}</div>`).join('')}</template>`,
  `const show = () => {
  const id = location.hash.replace('#photo-', '')
  const big = document.querySelector('#photos').content.querySelector('[data-id="' + id + '"]')
  document.getElementById('lightbox').style.display = big ? 'flex' : 'none'
  document.getElementById('big').replaceChildren(...(big ? [big.cloneNode(true)] : []))
}
document.getElementById('close').onclick = () => { location.hash = '' }
addEventListener('hashchange', show)
show()`,
)

export const gallery: LocalTask = {
  id: 'gallery',
  set: 'browser',
  place: 'local',
  kind: 'tiny',
  prompt: site => `The photo gallery at ${site}/gallery/ has unlabeled pictures. Open the picture of the red bicycle at full size.`,
  check: async seen => all(tabAt(seen, new RegExp(`/gallery/#photo-${wanted.id}$`)), await seen.judge('A large picture of a red bicycle fills the view on its own, not as one small thumbnail among many.')),
  page: path => (path === '/' ? page : undefined),
}
