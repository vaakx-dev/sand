import type { UiSurfaceContribution } from "sand:api/workbench";

export function available(surface: UiSurfaceContribution): boolean {
  return surface.available?.() !== false;
}

export function surfaceIcon(surface: UiSurfaceContribution, size: number): HTMLElement {
  return surface.renderIcon(size);
}
