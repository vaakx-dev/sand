import katexCss from 'katex/dist/katex.min.css' with { type: 'text' }
import { fontRoute } from '../fonts/route'

export const mathCss = `${katexCss.replaceAll('url(fonts/', `url(${fontRoute}`)}
.katex-display { margin: 0; }
`
