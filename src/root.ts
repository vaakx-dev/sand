export function createRoot(): { mount(node: HTMLElement): void; mounted(): boolean } {
  let isMounted = false;
  return {
    mount(node) {
      if (isMounted) throw new Error("an extension already mounted the application root");
      const root = document.getElementById("app");
      if (!root) throw new Error("application root is missing");
      root.replaceChildren(node);
      isMounted = true;
    },
    mounted: () => isMounted,
  };
}
