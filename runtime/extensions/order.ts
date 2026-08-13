import type { Loaded } from "./discovery.ts";

interface Result {
  ordered: Loaded[];
  errors: Map<string, string>;
  providers: Map<string, Loaded>;
}

export function order(
  extensions: Map<string, Loaded>,
  selections: ReadonlyMap<string, string> = new Map(),
): Result {
  const ordered: Loaded[] = [];
  const errors = new Map<string, string>();
  const providers = apiProviders(extensions, selections, errors);
  const states = new Map<string, "visiting" | "complete">();
  const stack: string[] = [];

  const visit = (extension: Loaded): boolean => {
    const id = extension.manifest.id;
    if (errors.has(id)) return false;
    if (states.get(id) === "complete") return true;
    if (states.get(id) === "visiting") {
      const cycle = stack.slice(stack.indexOf(id));
      const message = `dependency cycle: ${cycle.join(", ")}`;
      for (const member of cycle) errors.set(member, message);
      return false;
    }

    const requirements = extension.manifest.uses ?? [];
    const missing = requirements.filter((required) => !providers.has(required));
    if (missing.length) {
      errors.set(
        id,
        `missing required API${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
      );
      return false;
    }

    states.set(id, "visiting");
    stack.push(id);
    for (const required of requirements) {
      if (visit(providers.get(required)!)) continue;
      if (!errors.has(id)) errors.set(id, `required API unavailable: ${required}`);
      stack.pop();
      states.set(id, "complete");
      return false;
    }
    stack.pop();
    states.set(id, "complete");
    ordered.push(extension);
    return true;
  };

  for (const extension of extensions.values()) {
    if (extension.enabled && selected(extension, providers)) visit(extension);
  }
  return { ordered, errors, providers };
}

function selected(extension: Loaded, providers: Map<string, Loaded>): boolean {
  const names = Object.keys(extension.manifest.provides ?? {});
  return names.length === 0 || names.some((name) => providers.get(name) === extension);
}

function apiProviders(
  extensions: Map<string, Loaded>,
  selections: ReadonlyMap<string, string>,
  errors: Map<string, string>,
): Map<string, Loaded> {
  const candidates = new Map<string, Loaded[]>();
  for (const extension of extensions.values()) {
    if (!extension.enabled) continue;
    for (const name of Object.keys(extension.manifest.provides ?? {})) {
      const entries = candidates.get(name) ?? [];
      entries.push(extension);
      candidates.set(name, entries);
    }
  }

  const providers = new Map<string, Loaded>();
  for (const [name, entries] of candidates) {
    const selected = selections.get(name);
    if (selected) {
      const provider = entries.find((extension) => extension.manifest.id === selected);
      if (provider) {
        providers.set(name, provider);
        continue;
      }
      const message = `selected provider for API ${name} is unavailable: ${selected}`;
      for (const extension of entries) errors.set(extension.manifest.id, message);
      continue;
    }
    const user = entries.filter((extension) => extension.source === "user");
    const preferred = user.length > 0 ? user : entries;
    if (preferred.length === 1) {
      providers.set(name, preferred[0]!);
      continue;
    }
    const ids = preferred.map((extension) => extension.manifest.id).join(", ");
    for (const extension of preferred) errors.set(
      extension.manifest.id,
      `multiple providers for API ${name}: ${ids}`,
    );
  }
  return providers;
}
