import { dynamicChild, form, icon, input, span } from "@vaakx-dev/vrui";
import { Search, X } from "lucide";

import type { SearchFieldOptions } from "../api.ts";
import { iconButton } from "../controls/icon_button.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const SearchField = styled(form, {
  width: "100%",
  minWidth: 0,
  height: tokens.size.control,
  minHeight: tokens.size.control,
  maxHeight: tokens.size.control,
  flex: "0 1 auto",
  display: "flex",
  alignItems: "center",
  gap: tokens.space.small,
  paddingInline: tokens.space.medium,
  border: "1px solid transparent",
  borderRadius: tokens.radius.control,
  color: "var(--muted)",
  "&[data-size=header]": {
    height: tokens.size.header,
    minHeight: tokens.size.header,
    maxHeight: tokens.size.header,
  },
});

const Input = styled(input, {
  minWidth: 0,
  flex: 1,
  padding: 0,
  border: 0,
  outline: 0,
  color: "var(--text)",
  background: "transparent",
  fontSize: tokens.font.small,
  "&::placeholder": { color: "var(--muted)", opacity: 1 },
});

export function searchField(options: SearchFieldOptions): HTMLElement {
  return SearchField(
    {
      role: "search",
      "data-size": options.size ?? "standard",
      onSubmit: (event) => {
        event.preventDefault();
        void options.onSubmit?.();
      },
    },
    icon(Search, tokens.size.iconCompact),
    Input({
      type: "search",
      bindValue: options.value,
      placeholder: options.placeholder,
      "aria-label": options.label,
      onInput: options.onInput,
      onKeyDown: options.onKeyDown,
      onMount: (element) => options.onMount?.(element),
    }),
    dynamicChild(() => Boolean(options.value.get()), (visible) => visible
      ? iconButton({
          label: `Clear ${options.label.toLocaleLowerCase()}`,
          variant: "compact",
          renderIcon: (size) => icon(X, size),
          onClick: () => {
            options.value.set("");
            options.onClear?.();
          },
        })
      : span({ hidden: true })),
  );
}
