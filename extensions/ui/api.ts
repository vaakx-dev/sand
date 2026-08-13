import type { Child, ClassValue, Derive, Props, Sig } from "@vaakx-dev/vrui";

import type { ExtensionApis, ThemeContribution } from "@sand/extension-api";

export const UI_API = "ui";

export interface Readable<T> {
  get(): T;
}

export interface Writable<T> extends Readable<T> {
  set(value: T): void;
}

export type Value<T> = T | (() => T) | Readable<T>;

export interface Style {
  [property: string]: string | number | null | undefined | Style;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "toolbar" | "selector";
export type ButtonSize = "compact" | "standard";

export interface ButtonOptions extends Omit<Props<HTMLButtonElement>, "class" | "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: ClassValue;
  busy?: Value<boolean>;
}

export type IconButtonVariant =
  | "standard"
  | "compact"
  | "dense"
  | "round"
  | "window";

export interface IconButtonOptions {
  label: Value<string>;
  renderIcon(size: number): HTMLElement;
  onClick(event: MouseEvent): void;
  variant?: IconButtonVariant;
  className?: ClassValue;
  selected?: Value<boolean>;
  busy?: Value<boolean>;
  disabled?: Value<boolean>;
  hidden?: Value<boolean>;
  dataRole?: string;
  tone?: "default" | "danger";
}

export type MenuTone = "default" | "danger";

export interface MenuItem {
  label: Value<string>;
  renderIcon?(size: number): HTMLElement;
  shortcut?: Value<string>;
  disabled?: Value<boolean>;
  selected?: Value<boolean>;
  tone?: MenuTone;
  children?: Value<readonly MenuEntry[]>;
  run?(): void | Promise<void>;
}

export interface MenuSeparator {
  separator: true;
}

export type MenuEntry = MenuItem | MenuSeparator;

export interface MenuButtonOptions {
  label: Value<string>;
  renderIcon?(size: number): HTMLElement;
  items: Value<readonly MenuEntry[]>;
  trigger?: "button" | "icon" | "toolbar" | "selector";
  align?: "start" | "end";
  width?: number;
  selected?: Value<boolean>;
  disabled?: Value<boolean>;
  hidden?: Value<boolean>;
  open?: Writable<boolean>;
  onOpenChange?(open: boolean): void;
}

export interface ContextMenuOptions {
  x: number;
  y: number;
  items: Value<readonly MenuEntry[]>;
  width?: number;
  onDismiss(): void;
}

export interface PaneOptions {
  visible: Value<boolean>;
  maximized?: Value<boolean>;
  width: Value<number>;
  minimumWidth?: number;
  maximumWidth?: number;
  onResize(width: number): void;
  onResizeEnd?(): void;
  header?: Child;
}

export interface TabItem {
  id: string;
  label: string;
  renderIcon?(size: number): HTMLElement;
}

export interface TabsOptions<T> {
  items: Value<readonly T[]>;
  active: Value<string | null>;
  actions?: Child;
  getId(item: T): string;
  getLabel(item: T): string;
  renderIcon?(item: T, size: number): HTMLElement;
  isDirty?(item: T): boolean;
  variant?: "panel" | "document";
  onSelect(item: T): void;
  onClose?(item: T): void;
}

export interface SearchFieldOptions {
  value: Writable<string>;
  label: string;
  placeholder?: string;
  size?: "standard" | "header";
  onInput?(): void;
  onSubmit?(): void | Promise<void>;
  onClear?(): void;
  onKeyDown?(event: KeyboardEvent): void;
  onMount?(element: HTMLInputElement): void | (() => void);
}

export interface TreeItemOptions {
  label: Child;
  depth?: number;
  selected?: Value<boolean>;
  expanded?: boolean;
  renderIcon?(size: number): HTMLElement;
  onClick(): void;
}

export interface ListItemOptions {
  label: Child;
  description?: Child;
  detail?: Child;
  renderIcon?(size: number): HTMLElement;
  selected?: Value<boolean>;
  disabled?: Value<boolean>;
  onClick?(): void;
}

export interface PageOptions {
  title: Child;
  description?: Child;
}

export interface SettingOptions {
  title: Child;
  description?: Child;
  control: Child;
}

export interface SwitchOptions {
  label: string;
  checked: Writable<boolean>;
  onChange?(checked: boolean): void;
}

export interface TextFieldOptions extends Omit<Props<HTMLInputElement>, "class" | "className"> {
}

export interface SelectFieldOptions extends Omit<Props<HTMLSelectElement>, "class" | "className"> {
  options: readonly { value: string; label: string }[];
}

export interface BadgeOptions {
  label: Child;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface ModalOptions {
  label?: string;
  width?: number;
  onDismiss(): void;
}

export interface ShortcutHint {
  keys: Child;
  label: Child;
}

export interface ModalHeaderOptions {
  title?: Child;
  leading?: Child;
  content?: Child;
}

export interface ModalBodyOptions extends Omit<Props<HTMLDivElement>, "class" | "className"> {
  variant?: "form" | "list";
}

export interface PopoverOptions {
  anchor: HTMLElement;
  width?: number;
  align?: "start" | "end";
  padding?: number;
  onDismiss(): void;
}

export interface ChoiceItem {
  id: string;
  label: string;
  description?: string;
  renderIcon?(size: number): HTMLElement;
  disabled?: boolean;
}

export interface ChoiceGridOptions<T extends ChoiceItem> {
  items: Value<readonly T[]>;
  onSelect(item: T): void;
}

export interface EmptyStateOptions {
  title: Child;
  description?: Child;
  content?: Child;
}

export interface ViewStackItem {
  id: string;
  node: HTMLElement;
}

export interface ViewStackOptions<T extends ViewStackItem> {
  items: Sig<T[]> | Derive<T[]>;
  active: Value<string | null>;
}

export interface UiTokens {
  layout: {
    content: number;
    copy: number;
  };
  space: {
    compact: number;
    small: number;
    medium: number;
    large: number;
    section: number;
    content: number;
    page: number;
  };
  size: {
    indicator: number;
    iconTiny: number;
    iconCompact: number;
    icon: number;
    controlTiny: number;
    controlCompact: number;
    control: number;
    controlLarge: number;
    header: number;
    headerLarge: number;
    setting: number;
  };
  radius: {
    compact: number;
    control: number;
    row: number;
    surface: number;
    dialog: number;
    round: number;
  };
  font: {
    caption: number;
    small: number;
    label: number;
    body: number;
    content: number;
    title: number;
  };
  weight: {
    medium: number;
    semibold: number;
    bold: number;
  };
  line: {
    body: number;
    content: number;
  };
}

export interface SandUi {
  readonly tokens: UiTokens;
  button(options: ButtonOptions, ...children: Child[]): HTMLButtonElement;
  iconButton(options: IconButtonOptions): HTMLButtonElement;
  menuButton(options: MenuButtonOptions): HTMLElement;
  contextMenu(options: ContextMenuOptions): HTMLElement;
  pane(options: PaneOptions, ...children: Child[]): HTMLElement;
  tabs<T>(options: TabsOptions<T>): HTMLElement;
  choiceGrid<T extends ChoiceItem>(options: ChoiceGridOptions<T>): HTMLElement;
  emptyState(options: EmptyStateOptions): HTMLElement;
  viewStack<T extends ViewStackItem>(options: ViewStackOptions<T>): HTMLElement;
  searchField(options: SearchFieldOptions): HTMLElement;
  treeItem(options: TreeItemOptions): HTMLButtonElement;
  listItem(options: ListItemOptions): HTMLElement;
  page(options: PageOptions, ...children: Child[]): HTMLElement;
  setting(options: SettingOptions): HTMLElement;
  switch(options: SwitchOptions): HTMLButtonElement;
  textField(options: TextFieldOptions): HTMLInputElement;
  selectField(options: SelectFieldOptions): HTMLSelectElement;
  badge(options: BadgeOptions): HTMLElement;
  modal(options: ModalOptions, ...children: Child[]): HTMLElement;
  modalBody(options: ModalBodyOptions, ...children: Child[]): HTMLElement;
  modalActions(...children: Child[]): HTMLElement;
  shortcutBar(items: readonly ShortcutHint[]): HTMLElement;
  modalHeader(options: ModalHeaderOptions): HTMLElement;
  popover(options: PopoverOptions, ...children: Child[]): HTMLElement;
  css(...styles: Style[]): string;
  theme(
    contribution: ThemeContribution | undefined,
    appearance: "light" | "dark" | "system",
  ): () => void;
}

export function useUi(apis: ExtensionApis): SandUi {
  return apis.get<SandUi>(UI_API);
}
