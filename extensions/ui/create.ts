import { css } from "@emotion/css";

import type { SandUi } from "./api.ts";
import { uiButton } from "./controls/button.ts";
import { iconButton } from "./controls/icon_button.ts";
import { choiceGrid } from "./components/choice_grid.ts";
import { emptyState } from "./components/empty_state.ts";
import { badge, page, selectField, setting, switchControl, textField } from "./components/forms.ts";
import { contextMenu } from "./components/menu.ts";
import { menuButton } from "./components/menu_button.ts";
import { modal, modalActions, modalBody, modalHeader, shortcutBar } from "./components/modal.ts";
import { pane } from "./components/pane.ts";
import { popover } from "./components/popover.ts";
import { listItem } from "./components/list_item.ts";
import { searchField } from "./components/search_field.ts";
import { tabs } from "./components/tabs.ts";
import { treeItem } from "./components/tree_item.ts";
import { viewStack } from "./components/view_stack.ts";
import { installFoundation } from "./foundation.ts";
import { applyTheme } from "./theme.ts";
import { tokens } from "./tokens.ts";

export function createUi(): SandUi {
  installFoundation(tokens);
  return {
    tokens,
    button: uiButton,
    iconButton,
    menuButton,
    contextMenu,
    pane,
    tabs,
    choiceGrid,
    emptyState,
    viewStack,
    searchField,
    treeItem,
    listItem,
    page,
    setting,
    switch: switchControl,
    textField,
    selectField,
    badge,
    modal,
    modalBody,
    modalActions,
    shortcutBar,
    modalHeader,
    popover,
    css: (...styles) => css(...styles as Parameters<typeof css>),
    theme: applyTheme,
  };
}
