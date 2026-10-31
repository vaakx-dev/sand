import { actionTones, controlButton, iconButton, linkButton, navButton, plainButton, primaryAction, quietButton, rowButton, secondaryAction } from './buttons/button'
import { closeButton } from './buttons/close'
import { copyButton } from './buttons/copy'
import { floatButton } from './buttons/float'
import { quoteButton } from './buttons/quote'
import { rowAction } from './buttons/row-action'
import { splitButton } from './buttons/split'
import { toggleSwitch } from './buttons/toggle'
import { codeBlock } from './code/code-block'
import { choiceChips } from './context-menu/chips'
import { contextMenu, menuLayer } from './context-menu/menu'
import { searchField, searchRow, textArea, textInput } from './fields/field'
import { appIcon, showSideButton, sideHead } from './heads/app-icon'
import { headTitle, pageHead, paneHead } from './heads/page-head'
import { sectionHeading } from './heads/section-heading'
import { countMark, metaLine, rowTitle } from './heads/text'
import { projectAvatar, projectIcon } from './icons/avatar'
import { icon } from './icons/lucide'
import { modelLogo, providerColor, providerIcon } from './icons/providers'
import { layer } from './layer'
import { markerLine } from './marks/marker'
import { badge, checkMark, chevron, doneMark, dot, elapsed, okMark, progressSteps, shrinkBadge, spinner, starMark, statusLine, withDot, working } from './marks/marks'
import { textRule } from './marks/rule'
import { shine } from './marks/shine'
import { stepMark } from './marks/state-marks'
import { statusBadge, statusLabel } from './marks/status'
import { toneText } from './marks/tones'
import { chipButton, chipPopover } from './menus/chip'
import { dropdown } from './menus/dropdown'
import { menuSeparator, popover } from './menus/menu'
import { choiceCheck, choiceItem, menuItem } from './menus/menu-item'
import { menuReason } from './menus/reason'
import { navActionIcon } from './nav/action-icon'
import { sideColumn } from './nav/side-column'
import { bannerTitle, statusBanner } from './notes/banner'
import { callout, errorText } from './notes/notes'
import { checkRow } from './rows/check-row'
import { expandRow, expandToggle } from './rows/expand'
import { listRow } from './rows/list-row'
import { rowDetail, rowList, rowWarning, sectionRow, settingsRow } from './rows/rows'
import { segmented, settingsSection } from './rows/settings'
import { dockFade } from './scroll/fade'
import { stableGutter } from './scroll/gutter'
import { jumpButton } from './scroll/jump'
import { deviceCode, waitingLine } from './setup/device-code'
import { setupColumn, setupFooter, setupFrame, setupHeading, setupNote, setupScreen } from './setup/setup'
import { overlay, sheet, sheetBody, sheetFoot, sheetHead, sheetStep } from './sheets/overlay'
import { sheetText } from './sheets/text'
import { emptyState, errorState, loadingState } from './states/states'
import { diffRow } from './tools/diff'
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
import { nearEnd, toEnd } from './scroll/end'

const gesture = { canScrollToward, direction, editing, follow, selecting }

export const kit = {
  actionTones,
  appIcon,
  badge,
  bannerTitle,
  callout,
  checkMark,
  checkRow,
  chevron,
  chipButton,
  chipPopover,
  choiceCheck,
  choiceChips,
  choiceItem,
  closeButton,
  codeBlock,
  contextMenu,
  controlButton,
  copyButton,
  copyText,
  countMark,
  delayed,
  deviceCode,
  diffRow,
  dismissible,
  dockFade,
  doneMark,
  dot,
  dropdown,
  elapsed,
  emptyState,
  errorState,
  errorText,
  expandRow,
  expandToggle,
  floatButton,
  fold,
  gesture,
  hasOpenLayer,
  headTitle,
  icon,
  iconButton,
  isMac,
  jumpButton,
  layer,
  linkButton,
  listbox,
  listRow,
  loadingState,
  markerLine,
  menuItem,
  menuLayer,
  menuReason,
  menuSeparator,
  metaLine,
  modal,
  modelLogo,
  navActionIcon,
  navButton,
  nearEnd,
  okMark,
  onPressOutside,
  openTab,
  optionProps,
  overlay,
  ownedByNode,
  pageHead,
  paneHead,
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
  splitButton,
  stableGutter,
  starMark,
  statusBadge,
  statusBanner,
  statusLabel,
  statusLine,
  stepMark,
  style,
  textArea,
  textInput,
  textRule,
  toEnd,
  toggleSwitch,
  toneText,
  toolBody,
  toolCard,
  waitingLine,
  withDot,
  working,
}
