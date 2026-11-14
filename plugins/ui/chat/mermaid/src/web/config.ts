import type { Theme, ThemeRole } from '@sand/ui-theme/contract'
import { type Shade, theme as themeColors } from '@vaakx-dev/vrui'
import type { MermaidConfig } from 'mermaid'

const SERIES: ThemeRole[] = ['info', 'success', 'warning', 'violet', 'danger', 'sky', 'orange', 'accent']

const SERIES_SHADE: Shade = '700'

const FONT_SIZE = 14

const SECURE = ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges', 'suppressErrorRendering', 'htmlLabels', 'theme', 'themeVariables', 'themeCSS', 'darkMode', 'fontFamily']

const numbered = (prefix: string, values: (string | undefined)[], start = 0) => Object.fromEntries(values.map((value, index) => [`${prefix}${index + start}`, value]))

const variables = ({ palette }: Theme, fontFamily: string) => {
  const { colors } = themeColors(palette)
  const color = (role: ThemeRole, shade: Shade) => colors[role]?.[shade]
  const neutral = (shade: Shade) => color('neutral', shade)
  const series = SERIES.map(role => color(role, SERIES_SHADE))
  const seriesText = SERIES.map(() => neutral('50'))
  return {
    fontFamily,
    fontSize: `${FONT_SIZE}px`,
    dropShadow: 'none',
    background: neutral('900'),
    textColor: neutral('200'),
    lineColor: neutral('400'),
    primaryColor: neutral('800'),
    primaryTextColor: neutral('100'),
    primaryBorderColor: neutral('600'),
    secondaryColor: neutral('700'),
    secondaryTextColor: neutral('100'),
    secondaryBorderColor: neutral('500'),
    tertiaryColor: neutral('950'),
    tertiaryTextColor: neutral('200'),
    tertiaryBorderColor: neutral('700'),
    mainBkg: neutral('800'),
    nodeBorder: neutral('600'),
    nodeTextColor: neutral('100'),
    clusterBkg: neutral('950'),
    clusterBorder: neutral('700'),
    titleColor: neutral('100'),
    edgeLabelBackground: neutral('900'),
    actorBkg: neutral('800'),
    actorBorder: neutral('600'),
    actorTextColor: neutral('100'),
    actorLineColor: neutral('500'),
    signalColor: neutral('300'),
    signalTextColor: neutral('200'),
    labelBoxBkgColor: neutral('800'),
    labelBoxBorderColor: neutral('600'),
    labelTextColor: neutral('100'),
    loopTextColor: neutral('200'),
    activationBkgColor: neutral('700'),
    activationBorderColor: neutral('500'),
    sequenceNumberColor: neutral('900'),
    noteBkgColor: color('warning', '950'),
    noteBorderColor: color('warning', '700'),
    noteTextColor: neutral('100'),
    errorBkgColor: color('danger', '950'),
    errorTextColor: color('danger', '400'),
    pieTitleTextColor: neutral('100'),
    pieSectionTextColor: neutral('50'),
    pieLegendTextColor: neutral('200'),
    pieStrokeColor: neutral('900'),
    pieOuterStrokeColor: neutral('900'),
    ...numbered('pie', series, 1),
    ...numbered('cScale', series),
    ...numbered('cScaleLabel', seriesText),
    ...numbered('git', series),
    ...numbered('gitBranchLabel', seriesText),
  }
}

const diagramConfig = (theme: Theme, fontFamily: string): MermaidConfig => ({
  startOnLoad: false,
  securityLevel: 'strict',
  suppressErrorRendering: true,
  htmlLabels: false,
  secure: SECURE,
  theme: 'base',
  darkMode: theme.mode === 'dark',
  fontFamily,
  fontSize: FONT_SIZE,
  themeVariables: variables(theme, fontFamily),
})

export { diagramConfig }
