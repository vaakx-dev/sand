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
import { navMark } from './marks/nav-mark'
import { textRule } from './marks/rule'
import { shine } from './marks/shine'
import { stateMark, stepMark } from './marks/state-marks'
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
  deviceCode,
  diffRow,
  dockFade,
  doneMark,
  dot,
  dropdown,
  elapsed,
  errorRow,
  errorText,
  floatButton,
  fold,
  groupLabel,
  headTitle,
  hint,
  hintRow,
  icon,
  iconButton,
  itemRow,
  jumpButton,
  layer,
  linkButton,
  markerLine,
  menuItem,
  menuLayer,
  menuSeparator,
  modelLogo,
  navActionIcon,
  navButton,
  navMark,
  note,
  okMark,
  overlay,
  pageHead,
  paneHead,
  paneRow,
  plainButton,
  popover,
  popoverItem,
  primaryAction,
  progressSteps,
  projectAvatar,
  projectIcon,
  providerColor,
  providerIcon,
  quietButton,
  quoteButton,
  radioMark,
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
  stateMark,
  statusBadge,
  statusBanner,
  statusLabel,
  statusLine,
  stepMark,
  textInput,
  textRule,
  tile,
  toggleSwitch,
  toolBody,
  toolCard,
  waitingLine,
  working,
}
