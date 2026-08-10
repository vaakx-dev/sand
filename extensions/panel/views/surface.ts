import type { UiSurfaceContribution } from "@sand/extension-api";

export function available(surface: UiSurfaceContribution): boolean {
  return surface.available?.() !== false;
}

export function surfaceIcon(surface: UiSurfaceContribution, size: number): HTMLElement {
  return surface.renderIcon(size);
}
