#!/bin/sh
set -eu

repo='vaakx-dev/sand'
home="${SAND_HOME:-$HOME/.sand}"
tmp="${TMPDIR:-/tmp}"
channel="${SAND_CHANNEL:-release}"
pair="${SAND_PAIR:-}"
assets=''
label=''
base=''
secret=''
build=''
bun_version=''
work=''
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
    printf '\033[%sm%s\033[0m' "$1" "$2"
  else
    printf '%s' "$2"
  fi
}

say() {
  printf '%s\n' "$(paint 2 "$1")"
}

ok() {
  if [ $# -gt 1 ]; then
    printf '%s %s  %s\n' "$(paint 32 '✓')" "$1" "$(paint 2 "→ $2")"
  else
    printf '%s %s\n' "$(paint 32 '✓')" "$1"
  fi
}

report() {
  reported=1
  if [ -n "$secret" ]; then
    curl -fsS -X POST -H 'content-type: text/plain' --data-binary "$1" "$base/install/fail?k=$secret" </dev/null >/dev/null 2>&1 || true
  fi
}

step() {
  if [ -n "$secret" ]; then
    curl -fsS -X POST "$base/install/step?k=$secret&step=$1" </dev/null >/dev/null 2>&1 || true
  fi
}

fail() {
  report "$1"
  if [ -t 2 ]; then
    printf '\033[31m%s\033[0m\n' "$1" >&2
  else
    printf '%s\n' "$1" >&2
  fi
  exit 1
}

cleanup() {
  status=$?
  if [ -n "$work" ]; then
    rm -rf "$work" || true
  fi
  if [ -n "$bun_tmp" ]; then
    rm -f "$bun_tmp" || true
  fi
  if [ "$status" -ne 0 ] && [ -z "$handed" ]; then
    if [ -n "$made" ]; then
      rm -rf "$dir" || true
    fi
    if [ -z "$reported" ]; then
      report "The install script stopped (exit status $status)"
    fi
  fi
  exit "$status"
}

usage() {
  printf '%s\n' 'usage: install.sh [--nightly] [--pair <link from Add a PC>]' >&2
  exit 2
}

read_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --nightly) channel=nightly ;;
      --channel)
        [ $# -gt 1 ] || usage
        channel=$2
        shift
        ;;
      --pair)
        [ $# -gt 1 ] || usage
        pair=$2
        shift
        ;;
      *) usage ;;
    esac
    shift
  done
  case "$channel" in
    release|nightly) ;;
    *) fail "Unknown channel '$channel'; use release or nightly." ;;
  esac
}

read_pair() {
  [ -n "$pair" ] || return 0
  case "$pair" in
    http://*/#install=?*|https://*/#install=?*) ;;
    *) fail 'The pairing link is not one from Add a PC. Copy the command again.' ;;
  esac
  base=${pair%%/#install=*}
  secret=${pair##*#install=}
  case "$secret" in
    *[!A-Za-z0-9_-]*) fail 'The pairing link is damaged. Copy the command from Add a PC again.' ;;
  esac
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Installing sand needs $1. Install it with your package manager (for example: sudo apt install $1), then run the command again."
  fi
}

check_system() {
  system=$(uname -s 2>/dev/null || true)
  case "$system" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) fail 'This command is for Linux and macOS. On Windows, run the PowerShell command instead.' ;;
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
  machine=$(uname -m 2>/dev/null || true)
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

newest_release() {
  grep -oE '"(tag_name|published_at)": *("[^"]*"|null)' "$1" </dev/null |
    awk -F '"' '$2 == "tag_name" { tag = $4 } $2 == "published_at" { if (tag ~ /^v/ && $4 != "") print $4, tag; tag = "" }' |
    sort -r | head -n 1 | cut -d ' ' -f 2
}

find_release() {
  if [ -n "${SAND_RELEASE_URL:-}" ]; then
    assets=${SAND_RELEASE_URL%/}
    label=$assets
    return 0
  fi
  tag=nightly
  if [ "$channel" = release ]; then
    curl -fsSL -H 'accept: application/vnd.github+json' "https://api.github.com/repos/$repo/releases?per_page=50" -o "$work/releases.json" </dev/null ||
      fail 'Could not ask GitHub for the sand releases. Check the internet connection, or wait a few minutes if GitHub is limiting requests, then run the command again.'
    tag=$(newest_release "$work/releases.json")
    [ -n "$tag" ] || fail "There is no sand release on GitHub yet. Run the command with --nightly to get the nightly build."
  fi
  assets="https://github.com/$repo/releases/download/$tag"
  label="sand $tag"
}

stamp_value() {
  sed -n "s/.*\"$1\": *\"\\([^\"]*\\)\".*/\\1/p" "$work/sand-build.json" </dev/null | head -n 1
}

read_stamp() {
  curl -fsSL "$assets/sand-build.json" -o "$work/sand-build.json" </dev/null ||
    fail "Could not download $label from GitHub. If it was just published, its files may still be uploading; try again in a few minutes."
  build=$(stamp_value id)
  bun_version=$(stamp_value bun)
  case "$build" in
    ''|*[!A-Za-z0-9_-]*) fail "The build information of $label is damaged." ;;
  esac
  case "$bun_version" in
    ''|*[!0-9.]*) fail "The build information of $label names no Bun version." ;;
  esac
}

bun_runs() {
  [ -f "$1" ] && [ -x "$1" ] && [ "$("$1" --version </dev/null 2>/dev/null || true)" = "$bun_version" ]
}

sha_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" </dev/null | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" </dev/null | cut -d ' ' -f 1
  fi
}

need_sha() {
  if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
    fail 'Installing sand needs sha256sum or shasum to check the Bun download.'
  fi
}

expected_sha() {
  awk -v file="bun-$1.zip" '$2 == file || $2 == "*" file { print tolower($1) }' "$work/SHASUMS256.txt" </dev/null | head -n 1
}

place_bun() {
  zip="$work/bun-$1.zip"
  curl -fsSL "$bun_from/bun-$1.zip" -o "$zip" </dev/null || fail "Could not download Bun $bun_version from GitHub"
  if [ "$(sha_of "$zip")" != "$2" ]; then
    fail 'The Bun download from GitHub is damaged; run the command again'
  fi
  unzip -oq "$zip" -d "$work/bun" </dev/null || fail 'The Bun download from GitHub is damaged; run the command again'
  folder="$home/bun/$bun_version"
  mkdir -p "$folder" </dev/null || fail "Could not create $folder"
  bun_tmp="$folder/bun.tmp-$$"
  mv -f "$work/bun/bun-$1/bun" "$bun_tmp" || fail 'The Bun download from GitHub has no bun program'
  chmod 755 "$bun_tmp" || fail "Could not make $bun_tmp executable"
  if ! bun_runs "$bun_tmp"; then
    fail "Bun $bun_version does not run on this PC ($1)"
  fi
  mv -f "$bun_tmp" "$bun" || fail "Could not move Bun to $bun"
  bun_tmp=''
  printf '%s' "$1" >"$home/bun/target" || fail "Could not write $home/bun/target"
}

get_bun() {
  bun="$home/bun/$bun_version/bun"
  if bun_runs "$bun"; then
    ok "Bun $bun_version ready"
    return 0
  fi
  say "Downloading Bun $bun_version…"
  bun_from="https://github.com/oven-sh/bun/releases/download/bun-v$bun_version"
  curl -fsSL "$bun_from/SHASUMS256.txt" -o "$work/SHASUMS256.txt" </dev/null || fail "Could not download Bun $bun_version from GitHub"
  for candidate in $targets; do
    sha=$(expected_sha "$candidate")
    if [ -n "$sha" ]; then
      place_bun "$candidate" "$sha"
      ok "Bun $bun_version" "$bun"
      return 0
    fi
  done
  fail "Bun $bun_version has no build for this PC (tried $targets)"
}

download() {
  step sand
  say "Downloading $label…"
  curl -fsSL "$assets/sand.tar.gz" -o "$work/sand.tar.gz" </dev/null || fail "Could not download $label"
}

unpack() {
  mkdir -p "$home/app" </dev/null || fail "Could not create $home/app"
  dir="$home/app/$build"
  if [ -e "$dir" ]; then
    dir="$dir-$(date +%s </dev/null)"
  fi
  mkdir "$dir" </dev/null || fail "Could not create $dir"
  made=1
  SAND_BUNDLE="$work/sand.tar.gz" SAND_DIR="$dir" "$bun" -e 'await new Bun.Archive(await Bun.file(process.env.SAND_BUNDLE).bytes()).extract(process.env.SAND_DIR)' </dev/null || fail 'Could not unpack the sand download'
  if ! problem=$("$bun" "$dir/apps/sand/src/host/dist/release/ready.ts" "$dir" </dev/null 2>&1); then
    fail "${problem:-The sand download could not be checked; run the command again}"
  fi
  ok 'Sand downloaded' "$dir"
}

hand_over() {
  rm -rf "$work" || true
  work=''
  handed=1
  code=0
  if [ -n "$secret" ]; then
    SAND_CHANNEL="$channel" SAND_INSTALL_KEY="$secret" "$bun" "$dir/apps/sand/src/main.ts" install "$base" </dev/null || code=$?
  else
    SAND_CHANNEL="$channel" "$bun" "$dir/apps/sand/src/main.ts" install </dev/null || code=$?
  fi
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
  read_args "$@"
  read_pair
  step connected
  check_system
  need curl
  need unzip
  need_sha
  work=$(mktemp -d "$tmp/sand-install.XXXXXX" </dev/null) || fail 'Could not create a temporary folder'
  detect_targets
  find_release
  read_stamp
  say "Installing $label (build $build)"
  get_bun
  download
  unpack
  hand_over
}

main "$@"
