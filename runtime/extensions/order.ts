import type { Loaded } from "./discovery.ts";

interface Result {
  ordered: Loaded[];
  errors: Map<string, string>;
}

export function order(extensions: Map<string, Loaded>): Result {
  const ordered: Loaded[] = [];
  const errors = new Map<string, string>();
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

    const requirements = extension.manifest.requires ?? [];
    const missing = requirements.filter((required) => {
      const dependency = extensions.get(required);
      return !dependency || !dependency.enabled;
    });
    if (missing.length) {
      errors.set(
        id,
        `missing required extension${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
      );
      return false;
    }

    states.set(id, "visiting");
    stack.push(id);
    for (const required of requirements) {
      if (visit(extensions.get(required)!)) continue;
      if (!errors.has(id)) errors.set(id, `required extension unavailable: ${required}`);
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
    if (extension.enabled) visit(extension);
  }
  return { ordered, errors };
}
