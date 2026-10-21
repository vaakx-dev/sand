import { actionTones, controlButton, iconButton, linkButton, navButton, plainButton, primaryAction, quietButton, rowButton, secondaryAction } from './buttons/button'
import { closeButton } from './buttons/close'
import { copyButton } from './buttons/copy'
import { floatButton } from './buttons/float'
import { quoteButton } from './buttons/quote'
import { rowAction } from './buttons/row-action'
import { toggleSwitch } from './buttons/toggle'
import { choiceChips } from './context-menu/chips'
import { contextMenu, menuLayer } from './context-menu/menu'
import { searchField, searchRow, textInput } from './fields/field'
import { appIcon, showSideButton, sideHead } from './heads/app-icon'
import { headTitle, pageHead, paneHead } from './heads/page-head'
import { projectAvatar, projectIcon } from './icons/avatar'
import { icon } from './icons/lucide'
import { modelLogo, providerColor, providerIcon } from './icons/providers'
import { layer } from './layer'
import { markerLine } from './marks/marker'
import { badge, checkMark, chevron, doneMark, dot, elapsed, hint, okMark, progressSteps, radioMark, shrinkBadge, spinner, statusLine, working } from './marks/marks'
import { textRule } from './marks/rule'
import { shine } from './marks/shine'
import { stepMark } from './marks/state-marks'
import { statusBadge, statusLabel } from './marks/status'
import { chipButton, chipPopover } from './menus/chip'
import { dropdown } from './menus/dropdown'
import { groupLabel, menuSeparator, popover } from './menus/menu'
import { choiceItem, menuItem, popoverItem } from './menus/menu-item'
import { selectMenu } from './menus/select'
import { navActionIcon } from './nav/action-icon'
import { bannerTitle, statusBanner } from './notes/banner'
import { callout, errorText, note } from './notes/notes'
import { choiceButton, choiceList, tile } from './rows/choice'
import { paneRow } from './rows/pane-row'
import { errorRow, hintRow, itemRow, rowList, rowWarning, sectionRow } from './rows/rows'
import { segmented, settingsRow, settingsSection } from './rows/settings'
import { dockFade } from './scroll/fade'
import { jumpButton } from './scroll/jump'
import { deviceCode, waitingLine } from './setup/device-code'
import { setupColumn, setupFooter, setupFrame, setupHeading, setupNote, setupScreen } from './setup/setup'
import { overlay, sheet, sheetBody, sheetFoot, sheetHead, sheetStep } from './sheets/overlay'
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
  chevron,
  chipButton,
  chipPopover,
  choiceButton,
  choiceChips,
  choiceItem,
  choiceList,
  closeButton,
  contextMenu,
  controlButton,
  copyButton,
  copyText,
  delayed,
  deviceCode,
  diffRow,
  dismissible,
  dockFade,
  doneMark,
  dot,
  dropdown,
  elapsed,
  errorRow,
  errorText,
  floatButton,
  fold,
  gesture,
  groupLabel,
  hasOpenLayer,
  headTitle,
  hint,
  hintRow,
  icon,
  iconButton,
  isMac,
  itemRow,
  jumpButton,
  layer,
  linkButton,
  listbox,
  markerLine,
  menuItem,
  menuLayer,
  menuSeparator,
  modal,
  modelLogo,
  navActionIcon,
  navButton,
  nearEnd,
  note,
  okMark,
  onPressOutside,
  openTab,
  optionProps,
  overlay,
  pageHead,
  paneHead,
  paneRow,
  plainButton,
  popover,
  popoverItem,
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
  radioMark,
  returnFocus,
  rowAction,
  rowButton,
  rowList,
  rowWarning,
  searchField,
  searchRow,
  secondaryAction,
  sectionRow,
  segmented,
  selectMenu,
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
  shine,
  showSideButton,
  shrinkBadge,
  sideHead,
  spinner,
  statusBadge,
  statusBanner,
  statusLabel,
  statusLine,
  stepMark,
  style,
  textInput,
  textRule,
  tile,
  toEnd,
  toggleSwitch,
  toolBody,
  toolCard,
  waitingLine,
  working,
}
