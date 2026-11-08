import { actionTones, controlButton, iconButton, linkButton, navButton, plainButton, primaryAction, quietButton, rowButton, secondaryAction } from './buttons/button'
import { closeButton } from './buttons/close'
import { copyButton } from './buttons/copy'
import { floatButton } from './buttons/float'
import { quoteButton } from './buttons/quote'
import { rowAction } from './buttons/row-action'
import { toggleSwitch } from './buttons/toggle'
import { card } from './cards/card'
import { codeBlock } from './code/code-block'
import { choiceChips } from './context-menu/chips'
import { contextMenu, menuLayer } from './context-menu/menu'
import { searchField, searchRow, textArea, textInput } from './fields/field'
import { appIcon, showSideButton, sideHead } from './heads/app-icon'
import { headTitle, pageColumn, pageHead, paneHead } from './heads/page-head'
import { groupHeading, sectionHeading } from './heads/section-heading'
import { countMark, metaLine, pathLabel, rowTitle } from './heads/text'
import { projectAvatar, projectIcon } from './icons/avatar'
import { icon } from './icons/lucide'
import { modelLogo, providerColor, providerIcon } from './icons/providers'
import { layer } from './layer'
import { fileKindMark } from './marks/file-kind'
import { lineStat } from './marks/line-stat'
import { markerLine } from './marks/marker'
import { monogram } from './marks/monogram'
import { badge, checkMark, chevron, doneMark, dot, elapsed, okMark, progressSteps, shrinkBadge, spinner, starMark, statusLine, withDot, working } from './marks/marks'
import { keycap } from './marks/keycap'
import { textRule } from './marks/rule'
import { shine } from './marks/shine'
import { stateIcon } from './marks/state-icon'
import { stepMark } from './marks/state-marks'
import { statusBadge, statusLabel } from './marks/status'
import { toneText } from './marks/tones'
import { chipButton, chipPopover } from './menus/chip'
import { chipRow } from './menus/chip-row'
import { countChip } from './menus/count-chip'
import { dropdown } from './menus/dropdown'
import { menuSeparator, popover } from './menus/menu'
import { choiceCheck, choiceItem, menuItem } from './menus/menu-item'
import { menuLabel, menuReason } from './menus/reason'
import { navActionIcon } from './nav/action-icon'
import { sideColumn } from './nav/side-column'
import { bannerTitle, statusBanner } from './notes/banner'
import { callout, errorText } from './notes/notes'
import { checkRow } from './rows/check-row'
import { choiceList } from './rows/choice-list'
import { expandRow, expandToggle } from './rows/expand'
import { listRow } from './rows/list-row'
import { rowDetail, rowList, rowWarning, sectionRow, settingsRow } from './rows/rows'
import { segmented, settingsSection } from './rows/settings'
import { dockFade, topFade } from './scroll/fade'
import { stableGutter } from './scroll/gutter'
import { jumpButton } from './scroll/jump'
import { deviceCode, waitingLine } from './setup/device-code'
import { setupColumn, setupFooter, setupFrame, setupHeading, setupNote, setupScreen } from './setup/setup'
import { bottomSheet } from './sheets/bottom'
import { overlay, railOverlay, sheet, sheetBody, sheetFoot, sheetHead, sheetStep } from './sheets/overlay'
import { sheetText } from './sheets/text'
import { viewerBar, viewerShell, zoomControls } from './sheets/viewer'
import { emptyBlock, emptyState, errorState, loadingState } from './states/states'
import { tab, tabStrip } from './tabs/tabs'
import { diffRow } from './tools/diff'
import { diffBlock } from './tools/diff-block'
import { fold, toolBody, toolCard } from './tools/tool-card'
import { editing, selecting } from './gesture/busy'
import { direction } from './gesture/direction'
import { follow } from './gesture/follow'
import { canScrollToward } from './gesture/scroll'
import { onPressOutside, popupTrigger, pressOpens } from './layers/outside'
import { dismissible, hasOpenLayer, modal, returnFocus } from './layers/stack'
import { listbox } from './listbox/model'
import { optionProps } from './listbox/option'
import { pressMenu } from './menus/press'
import { copyText } from './page/clipboard'
import { delayed } from './page/delayed'
import { ownedByNode } from './page/owned'
import { isMac } from './page/platform'
import { style } from './page/style'
import { openTab } from './page/tab'
import { firstRowBelow, keepAnchor, loadAbove, nearEnd, toEnd } from './scroll/end'
import { followEnd } from './scroll/follow'

const gesture = { canScrollToward, direction, editing, follow, selecting }

export const kit = {
  actionTones,
  appIcon,
  badge,
  bannerTitle,
  bottomSheet,
  callout,
  card,
  checkMark,
  checkRow,
  chevron,
  chipButton,
  chipPopover,
  chipRow,
  choiceCheck,
  choiceChips,
  choiceItem,
  choiceList,
  closeButton,
  codeBlock,
  contextMenu,
  controlButton,
  copyButton,
  copyText,
  countChip,
  countMark,
  delayed,
  deviceCode,
  diffBlock,
  diffRow,
  dismissible,
  dockFade,
  doneMark,
  dot,
  dropdown,
  elapsed,
  emptyBlock,
  emptyState,
  errorState,
  errorText,
  expandRow,
  expandToggle,
  floatButton,
  fileKindMark,
  firstRowBelow,
  followEnd,
  fold,
  gesture,
  groupHeading,
  hasOpenLayer,
  headTitle,
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
  navActionIcon,
  navButton,
  nearEnd,
  okMark,
  onPressOutside,
  openTab,
  optionProps,
  overlay,
  ownedByNode,
  pageColumn,
  pageHead,
  paneHead,
  pathLabel,
  plainButton,
  popover,
  popupTrigger,
  pressMenu,
  pressOpens,
  primaryAction,
  progressSteps,
  projectAvatar,
  projectIcon,
  providerColor,
  providerIcon,
  quietButton,
  quoteButton,
  railOverlay,
  returnFocus,
  rowAction,
  rowButton,
  rowDetail,
  rowList,
  rowTitle,
  rowWarning,
  searchField,
  searchRow,
  secondaryAction,
  sectionHeading,
  sectionRow,
  segmented,
  settingsRow,
  settingsSection,
  setupColumn,
  setupFooter,
  setupFrame,
  setupHeading,
  setupNote,
  setupScreen,
  sheet,
  sheetBody,
  sheetFoot,
  sheetHead,
  sheetStep,
  sheetText,
  shine,
  showSideButton,
  shrinkBadge,
  sideColumn,
  sideHead,
  spinner,
  stableGutter,
  starMark,
  stateIcon,
  statusBadge,
  statusBanner,
  statusLabel,
  statusLine,
  stepMark,
  style,
  tab,
  tabStrip,
  textArea,
  textInput,
  textRule,
  toEnd,
  toggleSwitch,
  toneText,
  toolBody,
  toolCard,
  topFade,
  viewerBar,
  viewerShell,
  waitingLine,
  withDot,
  working,
  zoomControls,
}
