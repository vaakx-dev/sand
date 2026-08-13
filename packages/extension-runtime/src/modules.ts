export interface CoreModuleCatalog {
  readonly runtime: readonly string[];
  readonly ui: readonly string[];
}

export const coreModules = {
  runtime: [
    "@sand/extension-api",
    "@sand/extension-runtime",
  ],
  ui: [
    "@sand/extension-api",
    "@vaakx-dev/vrui",
    "lucide",
  ],
} as const satisfies CoreModuleCatalog;

export type UiCoreModule = (typeof coreModules.ui)[number];

const EXPORT_NAME = /^[$A-Z_a-z][$\w]*$/u;

export function coreModuleSource(
  registry: string,
  name: string,
  moduleExports: Iterable<string>,
): string {
  const exports = [...moduleExports].sort();
  const invalid = exports.find((exportName) => !EXPORT_NAME.test(exportName));
  if (invalid) throw new Error(`${name} has an unsupported export name: ${invalid}`);
  return [
    `const core = globalThis[Symbol.for(${JSON.stringify(registry)})].get(${JSON.stringify(name)});`,
    ...exports.map((exportName, index) =>
      `const value_${index} = core[${JSON.stringify(exportName)}];`
    ),
    `export { ${exports.map((exportName, index) =>
      `value_${index} as ${exportName}`
    ).join(", ")} };`,
  ].join("\n");
}
