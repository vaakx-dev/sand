const VERBATIM_UNC_PREFIX = "\\\\?\\UNC\\";
const VERBATIM_PREFIX = "\\\\?\\";

export function cleanPath(value: string): string {
  let path = value;
  if (path.toUpperCase().startsWith(VERBATIM_UNC_PREFIX.toUpperCase())) {
    path = `\\\\${path.slice(VERBATIM_UNC_PREFIX.length)}`;
  } else if (path.startsWith(VERBATIM_PREFIX)) {
    path = path.slice(VERBATIM_PREFIX.length);
  }

  if (isWindowsPath(path)) path = windowsSeparators(path);
  if (path === "/" || /^[a-z]:\\$/iu.test(path)) return path;
  return path.replace(/[\\/]+$/u, "");
}

export function samePath(left: string, right: string): boolean {
  return pathKey(left) === pathKey(right);
}

export function pathKey(value: string): string {
  const path = cleanPath(value);
  return isWindowsPath(path) ? path.toLowerCase() : path;
}

function isWindowsPath(path: string): boolean {
  return /^[a-z]:[\\/]/iu.test(path) || /^[\\/]{2}/u.test(path);
}

function windowsSeparators(path: string): string {
  const unc = /^[\\/]{2}/u.test(path);
  const normalized = path.replace(/[\\/]+/gu, "\\");
  return unc ? `\\${normalized}` : normalized;
}
