import { actionTones, controlButton, iconButton, linkButton, navButton, plainButton, primaryAction, quietButton, rowButton, secondaryAction } from './buttons/button'
import { backButton } from './buttons/back'
import { closeButton } from './buttons/close'
import { copyButton } from './buttons/copy'
import { floatButton } from './buttons/float'
import { quoteButton } from './buttons/quote'
import { toggleSwitch } from './buttons/toggle'
import { codeBlock } from './code/code-block'
import { choiceChips } from './context-menu/chips'
import { confirm, confirmButton } from './context-menu/confirm'
import { contextMenu, menuLayer } from './context-menu/menu'
import { editable } from './fields/editable'
import { searchField, searchLine, searchRow, textArea, textInput } from './fields/field'
import { field } from './fields/labelled'
import { appIcon } from './heads/app-icon'
import { pageBody } from './heads/page-body'
import { pageColumn, pageHead, paneHead } from './heads/page-head'
import { groupHeading, sectionHeading } from './heads/section-heading'
import { titleButton } from './heads/title-button'
import { barTitle, colorLabel, countMark, emphasis, metaLine, monoMeta, pageTitle, pathLabel, rowName, rowTitle, secondaryText, sectionTitle, sheetTitle, shortcutHint } from './heads/text'
import { projectAvatar, projectIcon } from './icons/avatar'
import { icon } from './icons/lucide'
import { modelLogo, providerColor, providerIcon } from './icons/providers'
import { layer } from './layer'
import { fileKindMark } from './marks/file-kind'
import { lineStat } from './marks/line-stat'
import { markerLine } from './marks/marker'
import { botFace } from './marks/face'
import { monogram } from './marks/monogram'
import { badge, checkMark, chevron, doneMark, dot, elapsed, okMark, opensMark, progressSteps, roundMark, shrinkBadge, spinner, starMark, statusLine, withDot } from './marks/marks'
import { keycap } from './marks/keycap'
import { textRule } from './marks/rule'
import { shine } from './marks/shine'
import { stateIcon, statusIcon } from './marks/state-icon'
import { stepMark } from './marks/state-marks'
import { statusBadge, statusLabel } from './marks/status'
import { toneText } from './marks/tones'
import { chipButton, chipPopover } from './menus/chip'
import { countChip } from './menus/count-chip'
import { dropdown } from './menus/dropdown'
import { pickerButton } from './menus/picker'
import { menuSeparator, popover } from './menus/menu'
import { choiceCheck, choiceItem, menuItem } from './menus/menu-item'
import { menuLabel, menuReason } from './menus/reason'
import { navActionIcon } from './nav/action-icon'
import { sideColumn } from './nav/side-column'
import { banner } from './notes/banner'
import { errorText } from './notes/notes'
import { checkRow } from './rows/check-row'
import { choiceList } from './rows/choice-list'
import { expandRow, expandToggle, textToggle } from './rows/expand'
import { actionItem } from './rows/action-item'
import { listRow } from './rows/list-row'
import { cardCaption, cardItem, cardRule } from './rows/card-item'
import { age, dayDivider, workRow, workRowBody, workStatus } from './rows/work-row'
import { rowDetail, rowList, rowWarning, sectionRow, settingsRow } from './rows/rows'
import { pageSection } from './rows/section'
import { segmented } from './rows/settings'
import { dockFade, scrollFade, topFade } from './scroll/fade'
import { stableGutter } from './scroll/gutter'
import { jumpButton } from './scroll/jump'
import { deviceCode, waitingLine } from './setup/device-code'
import { setupColumn, setupFooter, setupFrame, setupHeading, setupNote, setupScreen } from './setup/setup'
import { overlay, screenOverlay, sheet, sheetBody, sheetFoot, sheetStep } from './sheets/overlay'
import { viewerShell, zoomControls } from './sheets/viewer'
import { emptyPage, emptyState, errorState, loadingState } from './states/states'
import { tab, tabStrip } from './tabs/tabs'
import { diffRow } from './tools/diff'
import { diffBlock } from './tools/diff-block'
import { fold, toolBody, toolCard } from './tools/tool-card'
import { editing, selecting } from './gesture/busy'
import { alongWay, direction } from './gesture/direction'
import { fromSystemEdge } from './gesture/edge'
import { follow } from './gesture/follow'
import { canScrollToward } from './gesture/scroll'
import { onPressOutside, popupTrigger, pressOpens } from './layers/outside'
import { dismissible, hasOpenLayer, modal, returnFocus } from './layers/stack'
import { listbox } from './listbox/model'
import { optionProps } from './listbox/option'
import { copyText } from './page/clipboard'
import { delayed } from './page/delayed'
import { ownedByNode } from './page/owned'
import { isMac } from './page/platform'
import { style } from './page/style'
import { openTab } from './page/tab'
import { firstRowBelow, keepAnchor, loadAbove, nearEnd, toEnd } from './scroll/end'
import { followEnd } from './scroll/follow'

const gesture = { alongWay, canScrollToward, direction, editing, follow, fromSystemEdge, selecting }

export const kit = {
  actionItem,
  actionTones,
  age,
  appIcon,
  badge,
  banner,
  barTitle,
  botFace,
  checkMark,
  checkRow,
  chevron,
  chipButton,
  chipPopover,
  choiceCheck,
  choiceChips,
  choiceItem,
  choiceList,
  backButton,
  closeButton,
  codeBlock,
  colorLabel,
  confirm,
  confirmButton,
  contextMenu,
  controlButton,
  copyButton,
  copyText,
  countChip,
  countMark,
  dayDivider,
  delayed,
  deviceCode,
  diffBlock,
  diffRow,
  dismissible,
  dockFade,
  doneMark,
  dot,
  dropdown,
  editable,
  elapsed,
  emphasis,
  emptyPage,
  emptyState,
  errorState,
  errorText,
  expandRow,
  expandToggle,
  field,
  floatButton,
  fileKindMark,
  firstRowBelow,
  followEnd,
  fold,
  gesture,
  groupHeading,
  hasOpenLayer,
  icon,
  iconButton,
  isMac,
  jumpButton,
  keepAnchor,
  keycap,
  layer,
  lineStat,
  linkButton,
  listbox,
  listRow,
  loadAbove,
  loadingState,
  markerLine,
  menuItem,
  menuLabel,
  menuLayer,
  menuReason,
  menuSeparator,
  metaLine,
  modal,
  modelLogo,
  monogram,
  monoMeta,
  navActionIcon,
  navButton,
  nearEnd,
  okMark,
  opensMark,
  onPressOutside,
  openTab,
  optionProps,
  overlay,
  screenOverlay,
  ownedByNode,
  pageBody,
  pageColumn,
  pageHead,
  pageSection,
  pageTitle,
  paneHead,
  pathLabel,
  pickerButton,
  plainButton,
  popover,
  popupTrigger,
  pressOpens,
  primaryAction,
  progressSteps,
  projectAvatar,
  projectIcon,
  providerColor,
  providerIcon,
  quietButton,
  quoteButton,
  returnFocus,
  roundMark,
  rowButton,
  rowDetail,
  rowList,
  rowName,
  rowTitle,
  rowWarning,
  searchField,
  searchLine,
  searchRow,
  secondaryAction,
  secondaryText,
  sectionHeading,
  sectionRow,
  sectionTitle,
  segmented,
  settingsRow,
  settingsSection: pageSection,
  setupColumn,
  setupFooter,
  setupFrame,
  setupHeading,
  setupNote,
  setupScreen,
  sheet,
  sheetBody,
  sheetFoot,
  sheetStep,
  sheetText: secondaryText,
  sheetTitle,
  shine,
  cardCaption,
  cardItem,
  cardRule,
  shortcutHint,
  shrinkBadge,
  sideColumn,
  spinner,
  stableGutter,
  starMark,
  stateIcon,
  statusIcon,
  statusBadge,
  statusLabel,
  statusLine,
  stepMark,
  style,
  tab,
  tabStrip,
  titleButton,
  textArea,
  textInput,
  textRule,
  textToggle,
  toEnd,
  toggleSwitch,
  toneText,
  toolBody,
  toolCard,
  scrollFade,
  topFade,
  viewerShell,
  waitingLine,
  withDot,
  workRow,
  workRowBody,
  workStatus,
  zoomControls,
}
