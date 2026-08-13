import { css } from "@emotion/css";
import type { Child, Props } from "@vaakx-dev/vrui";

import type { Style } from "./api.ts";

export type ElementFactory<E extends HTMLElement> = (
  props?: Props<E>,
  ...children: Child[]
) => E;

export type StyledElement<E extends HTMLElement> = (
  props?: Props<E>,
  ...children: Child[]
) => E;

export function styled<E extends HTMLElement>(
  element: ElementFactory<E>,
  appearance: Style,
): StyledElement<E> {
  const className = css(appearance as Parameters<typeof css>[number]);
  return (props = {} as Props<E>, ...children) => element(
    { ...props, class: [className, props.class] },
    ...children,
  );
}
