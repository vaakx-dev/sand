import { button, div, h1, input, option, select, span, type Child } from "@vaakx-dev/vrui";

import type {
  BadgeOptions,
  PageOptions,
  SelectFieldOptions,
  SettingOptions,
  SwitchOptions,
  TextFieldOptions,
} from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const Page = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  overflow: "auto",
  padding: tokens.space.page,
});

const PageContent = styled(div, {
  width: `min(${tokens.layout.content}px, 100%)`,
  margin: "0 auto",
  "> h1": { margin: `0 0 ${tokens.space.content}px`, fontSize: tokens.font.title, fontWeight: tokens.weight.bold },
  "> h2": {
    margin: `${tokens.space.content}px 0 ${tokens.space.large}px`,
    color: "var(--text)",
    fontSize: tokens.font.body,
    fontWeight: tokens.weight.semibold,
  },
});

const PageDescription = styled(div, {
  margin: `${-tokens.space.section}px 0 ${tokens.space.content}px`,
  color: "var(--muted)",
  fontSize: tokens.font.label,
  lineHeight: tokens.line.body,
});

const Setting = styled(div, {
  minHeight: tokens.size.setting,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.section,
  borderBottom: "1px solid var(--border)",
  "@media (max-width: 720px)": {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: tokens.space.medium,
    paddingBlock: tokens.space.large,
  },
});

const Copy = styled(div, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.small,
});

const SettingTitle = styled(span, { color: "var(--text)", fontSize: tokens.font.label, fontWeight: tokens.weight.semibold });
const SettingDescription = styled(span, {
  maxWidth: tokens.layout.copy,
  color: "var(--muted)",
  fontSize: tokens.font.small,
  lineHeight: tokens.line.body,
});

const Control = styled(div, { flex: "none" });

const Switch = styled(button, {
  width: tokens.size.controlLarge,
  height: tokens.size.controlTiny,
  padding: tokens.space.compact,
  display: "flex",
  alignItems: "center",
  borderRadius: tokens.radius.surface,
  background: "var(--elevated)",
  cursor: "pointer",
  "&[aria-checked=true]": { justifyContent: "flex-end", background: "var(--accent)" },
});

const Knob = styled(span, {
  width: tokens.size.icon,
  height: tokens.size.icon,
  borderRadius: "50%",
  background: "var(--background)",
});

const TextField = styled(input, {
  minWidth: 0,
  height: tokens.size.controlLarge,
  paddingInline: tokens.space.medium,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.control,
  outline: 0,
  color: "var(--text)",
  background: "var(--background)",
  "&:focus": { borderColor: "var(--border)" },
});

const SelectField = styled(select, {
  minWidth: 176,
  height: tokens.size.controlLarge,
  paddingInline: tokens.space.medium,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.control,
  color: "var(--text)",
  background: "var(--surface)",
});

const Badge = styled(span, {
  padding: `${tokens.space.compact}px ${tokens.space.small}px`,
  borderRadius: tokens.radius.compact,
  color: "var(--muted)",
  background: "var(--surface)",
  fontSize: tokens.font.caption,
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  "&[data-tone=success]": { color: "var(--success)" },
  "&[data-tone=warning]": { color: "var(--warning)" },
  "&[data-tone=danger]": { color: "var(--danger)" },
});

export function page(options: PageOptions, ...children: Child[]): HTMLElement {
  return Page(
    {},
    PageContent(
      {},
      h1(options.title),
      options.description ? PageDescription({}, options.description) : null,
      ...children,
    ),
  );
}

export function setting(options: SettingOptions): HTMLElement {
  return Setting(
    {},
    Copy(
      {},
      SettingTitle({}, options.title),
      options.description ? SettingDescription({}, options.description) : null,
    ),
    Control({}, options.control),
  );
}

export function switchControl(options: SwitchOptions): HTMLButtonElement {
  return Switch(
    {
      type: "button",
      role: "switch",
      "aria-label": options.label,
      "aria-checked": () => options.checked.get(),
      onClick: () => {
        const checked = !options.checked.get();
        options.checked.set(checked);
        options.onChange?.(checked);
      },
    },
    Knob({}),
  );
}

export function textField(options: TextFieldOptions): HTMLInputElement {
  return TextField(options);
}

export function selectField(options: SelectFieldOptions): HTMLSelectElement {
  const { options: items, ...props } = options;
  return SelectField(
    props,
    ...items.map((item) => option({ value: item.value }, item.label)),
  );
}

export function badge(options: BadgeOptions): HTMLElement {
  return Badge({ "data-tone": options.tone ?? "neutral" }, options.label);
}
