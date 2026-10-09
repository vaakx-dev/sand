import type { InstallScript, ScriptOptions } from './options'

const quote = (value: string) => `'${value.replaceAll('\0', '').replaceAll("'", `'\\''`)}'`

const header = ({ base, secret, from, build, bun }: ScriptOptions) => `#!/bin/sh
set -eu

base=${quote(base.replace(/\/+$/, ''))}
secret=${quote(secret)}
from=${quote(from)}
build=${quote(build)}
bun_version=${quote(bun)}
`

const body = `
home="\${SAND_HOME:-$HOME/.sand}"
tmp="\${TMPDIR:-/tmp}"
work=''
bundle=''
dir=''
made=''
handed=''
reported=''
bun=''
bun_tmp=''
os=''
targets=''
color=''

paint() {
  if [ -n "$color" ]; then
    printf '\\033[%sm%s\\033[0m' "$1" "$2"
  else
    printf '%s' "$2"
  fi
}

say() {
  printf '%s\\n' "$(paint 2 "$1")"
}

ok() {
  if [ $# -gt 1 ]; then
    printf '%s %s  %s\\n' "$(paint 32 '✓')" "$1" "$(paint 2 "→ $2")"
  else
    printf '%s %s\\n' "$(paint 32 '✓')" "$1"
  fi
}

report() {
  reported=1
  curl -fsS -X POST -H 'content-type: text/plain' --data-binary "$1" "$base/install/fail?k=$secret" </dev/null >/dev/null 2>&1 || true
}

fail() {
  report "$1"
  if [ -t 2 ]; then
    printf '\\033[31m%s\\033[0m\\n' "$1" >&2
  else
    printf '%s\\n' "$1" >&2
  fi
  exit 1
}

cleanup() {
  status=$?
  if [ -n "$work" ]; then
    rm -rf "$work" </dev/null || true
  fi
  if [ -n "$bun_tmp" ]; then
    rm -f "$bun_tmp" </dev/null || true
  fi
  if [ "$status" -ne 0 ] && [ -z "$handed" ]; then
    if [ -n "$made" ]; then
      rm -rf "$dir" </dev/null || true
    fi
    if [ -z "$reported" ]; then
      report "The install script stopped (exit status $status)"
    fi
  fi
  exit "$status"
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "$2 needs $1. Install it with your package manager (for example: sudo apt install $1), then run the command again."
  fi
}

check_system() {
  system=$(uname -s </dev/null 2>/dev/null || true)
  case "$system" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail "This command is for Linux and macOS. On Windows, choose Windows in Add a PC and run the PowerShell command." ;;
  esac
}

has_avx2() {
  case "$os" in
    linux) grep -qw avx2 /proc/cpuinfo </dev/null 2>/dev/null ;;
    darwin)
      case "$(sysctl -n machdep.cpu.leaf7_features </dev/null 2>/dev/null || true)" in
        *AVX2*) return 0 ;;
        *) return 1 ;;
      esac
      ;;
    *) return 1 ;;
  esac
}

is_musl() {
  if [ -f /etc/alpine-release ]; then
    return 0
  fi
  command -v ldd >/dev/null 2>&1 || return 1
  ldd --version </dev/null 2>&1 | grep -qi musl
}

detect_targets() {
  machine=$(uname -m </dev/null 2>/dev/null || true)
  case "$machine" in
    x86_64|amd64) arch=x64 ;;
    aarch64|arm64) arch=aarch64 ;;
    *) fail "Sand can't run on this processor ($machine). Bun supports x64 and arm64." ;;
  esac
  if [ "$os" = darwin ] && [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated </dev/null 2>/dev/null || true)" = 1 ]; then
    arch=aarch64
  fi
  target="$os-$arch"
  if [ "$os" = linux ] && is_musl; then
    target="$target-musl"
  fi
  if [ "$arch" = x64 ] && has_avx2; then
    targets="$target $target-baseline"
  elif [ "$arch" = x64 ]; then
    targets="$target-baseline"
  else
    targets="$target"
  fi
}

bun_runs() {
  [ -f "$1" ] && [ -x "$1" ] && [ "$("$1" --version </dev/null 2>/dev/null || true)" = "$bun_version" ]
}

sha_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" </dev/null | cut -d ' ' -f 1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" </dev/null | cut -d ' ' -f 1
  fi
}

header_value() {
  grep -i "^$1:" "$work/bun.headers" </dev/null | tail -n 1 | cut -d : -f 2- | tr -d ' \\r' | tr 'A-F' 'a-f'
}

fetch_bun() {
  rm -f "$work/bun.gz" "$work/bun.headers" </dev/null
  http=$(curl -sSL -D "$work/bun.headers" -o "$work/bun.gz" -w '%{http_code}' "$base/bun?k=$secret&target=$1" </dev/null) || fail "Could not download Bun from $from"
  case "$http" in
    200) return 0 ;;
    404) return 1 ;;
  esac
  reason=$(head -c 2000 "$work/bun.gz" </dev/null 2>/dev/null || true)
  fail "Could not download Bun from $from (HTTP $http): $reason"
}

place_bun() {
  folder="$home/bun/$bun_version"
  mkdir -p "$folder" </dev/null || fail "Could not create $folder"
  bun_tmp="$folder/bun.tmp-$$"
  gzip -dc "$work/bun.gz" </dev/null >"$bun_tmp" || fail "The Bun download from $from is damaged; run the command again"
  have=$(sha_of "$bun_tmp")
  if [ -n "$have" ] && [ "$have" != "$(header_value x-sand-bun-sha256)" ]; then
    fail "The Bun download from $from is damaged; run the command again"
  fi
  chmod 755 "$bun_tmp" </dev/null || fail "Could not make $bun_tmp executable"
  if ! bun_runs "$bun_tmp"; then
    fail "The Bun $bun_version from $from does not run on this PC ($1)"
  fi
  mv -f "$bun_tmp" "$bun" </dev/null || fail "Could not move Bun to $bun"
  bun_tmp=''
  printf '%s' "$1" >"$home/bun/target" || fail "Could not write $home/bun/target"
}

get_bun() {
  bun="$home/bun/$bun_version/bun"
  if bun_runs "$bun"; then
    ok "Bun $bun_version ready"
    return 0
  fi
  for candidate in $targets; do
    if fetch_bun "$candidate"; then
      place_bun "$candidate"
      ok "Bun $bun_version from $from"
      return 0
    fi
  done
  fail "$from has no Bun $bun_version build for this PC (tried $targets)"
}

download() {
  bundle="$work/sand.tar.gz"
  curl -fsSL "$base/bundle?k=$secret" -o "$bundle" </dev/null || fail "Could not download sand from $from"
}

unpack() {
  mkdir -p "$home/app" </dev/null || fail "Could not create $home/app"
  dir="$home/app/$build"
  if [ -e "$dir" ]; then
    dir="$dir-$(date +%s </dev/null)"
  fi
  mkdir "$dir" </dev/null || fail "Could not create $dir"
  made=1
  SAND_BUNDLE="$bundle" SAND_DIR="$dir" "$bun" -e 'await new Bun.Archive(await Bun.file(process.env.SAND_BUNDLE).bytes()).extract(process.env.SAND_DIR)' </dev/null || fail 'Could not unpack the sand download'
  if ! problem=$("$bun" "$dir/apps/sand/src/host/dist/release/ready.ts" "$dir" </dev/null 2>&1); then
    fail "\${problem:-The sand download could not be checked; run the command again}"
  fi
  ok 'Sand downloaded' "$dir"
}

hand_over() {
  handed=1
  code=0
  SAND_INSTALL_KEY="$secret" "$bun" "$dir/apps/sand/src/main.ts" install "$base" </dev/null || code=$?
  if [ "$code" -ne 0 ] && [ "$code" -ne 3 ]; then
    report "Setup on the new PC stopped (exit status $code); see the terminal there"
  fi
  exit "$code"
}

main() {
  if [ -t 1 ]; then
    color=1
  fi
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  say "Sand from $from (build $build)"
  check_system
  need curl 'Installing sand'
  need gzip 'Installing sand'
  work=$(mktemp -d "$tmp/sand-install.XXXXXX" </dev/null) || fail 'Could not create a temporary folder'
  detect_targets
  get_bun
  download
  unpack
  hand_over
}

main
`

const refuse = (message: string) => `#!/bin/sh
printf '%s\\n' ${quote(message)} >&2
exit 1
`

export const shScript: InstallScript = {
  contentType: 'text/x-shellscript; charset=utf-8',
  render: (options) => header(options) + body,
  refuse,
}
