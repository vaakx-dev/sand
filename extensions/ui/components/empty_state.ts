import { div } from "@vaakx-dev/vrui";

import type { EmptyStateOptions } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const Root = styled(div, {
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: `${tokens.space.page}px ${tokens.space.content}px`,
});

const Title = styled(div, {
  color: "var(--text)",
  fontSize: tokens.font.body,
  fontWeight: tokens.weight.semibold,
});

const Description = styled(div, {
  marginTop: tokens.space.small,
  color: "var(--muted)",
  fontSize: tokens.font.small,
});

const Content = styled(div, {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  marginTop: tokens.space.content,
});

export function emptyState(options: EmptyStateOptions): HTMLElement {
  return Root(
    {},
    Title({}, options.title),
    options.description ? Description({}, options.description) : null,
    options.content ? Content({}, options.content) : null,
  );
}
