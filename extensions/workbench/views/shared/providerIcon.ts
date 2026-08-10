import { icon, span } from "@vaakx-dev/vrui";
import { Bot } from "lucide";

import type { AgentProviderIcon } from "@sand/extension-api";

import type { ProviderDescription } from "../../models.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

export function providerIcon(
  provider: ProviderDescription | undefined,
  size: number,
): HTMLElement {
  return span(
    { class: "provider-icon" },
    provider?.presentation?.icon
      ? svgIcon(provider.presentation.icon, size)
      : icon(Bot, size),
  );
}

function svgIcon(value: AgentProviderIcon, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  const path = document.createElementNS(SVG_NS, "path");
  svg.setAttribute("class", "provider-mark");
  svg.setAttribute("viewBox", value.viewBox);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", value.path);
  svg.append(path);
  return svg;
}
