#!/usr/bin/env bash
#
# cacheBust.sh: stop browsers serving stale CSS, JS and images.
#
# Gives each CSS, JS and image file the site references a random 6-character
# suffix, then updates the references in the .html, .css and .js files:
#
#   styles.css             -> styles.k3x9q2.css
#   images/band-photo.jpg  -> images/band-photo.p7d0wm.jpg
#
# Run it again before each deploy: an existing suffix is replaced, not stacked.
# Files nothing references (e.g. the black logo) are left alone, so links to
# them from other sites keep working.
#
# Notes:
# - Asset paths must be written out in full in the code ("images/wattle.svg").
#   A path built at runtime, like `images/${name}.svg`, can't be updated.
# - A previous suffix is spotted as ".xxxxxx" (6 lowercase letters/digits)
#   right before the extension, so avoid names like "app.vendor.js".
#
# Usage: ./cacheBust.sh [--dry-run]

set -euo pipefail

cd "$(dirname "$0")"

dry_run=false
case "${1:-}" in
  -n | --dry-run) dry_run=true ;;
  "") ;;
  *)
    echo "Usage: $0 [--dry-run]" >&2
    exit 1
    ;;
esac

# A path only counts as a reference when it isn't glued to other filename
# characters, so "script.js" won't match "myscript.js" or "script.js.map".
# A slash before it is fine, e.g. "https://www.quiversmusic.com/images/a.jpg".
export CB_BEFORE='(?<![\w.-])'
export CB_AFTER='(?![\w-]|\.\w)'

# Prints files (relative to the site root) with any of the given extensions.
list_files() {
  local args=() ext
  for ext in "$@"; do args+=(-o -iname "*.$ext"); done
  find . \( -name .git -o -name node_modules \) -prune -o \
    -type f \( "${args[@]:1}" \) -print | sed 's|^\./||' | sort
}

assets=()
while IFS= read -r f; do assets+=("$f"); done \
  < <(list_files css js jpg jpeg png gif svg webp avif)

sources=()
while IFS= read -r f; do sources+=("$f"); done < <(list_files html css js)

if [[ ${#assets[@]} -eq 0 || ${#sources[@]} -eq 0 ]]; then
  echo "No assets or source files found."
  exit 0
fi

# Sets $suffix to 6 random lowercase letters/digits.
suffix_chars=abcdefghijklmnopqrstuvwxyz0123456789
new_suffix() {
  local i
  suffix=
  for i in 1 2 3 4 5 6; do suffix+=${suffix_chars:RANDOM%36:1}; done
}

old_suffix_re='^(.+)\.[a-z0-9]{6}$'
olds=()
news=()
map= # "old<TAB>new" lines, read by the perl replacement below

for old in "${assets[@]}"; do
  if ! CB_PATH=$old perl -ne '
    BEGIN { $re = qr/$ENV{CB_BEFORE}\Q$ENV{CB_PATH}\E$ENV{CB_AFTER}/ }
    if (/$re/) { $found = 1; last }
    END { exit !$found }
  ' "${sources[@]}"; then
    echo "skip  $old (not referenced)"
    continue
  fi

  case $old in
    */*) dir=${old%/*}/ ;;
    *) dir= ;;
  esac
  name=${old##*/}
  ext=${name##*.}
  stem=${name%.*}
  if [[ $stem =~ $old_suffix_re ]]; then stem=${BASH_REMATCH[1]}; fi

  while :; do
    new_suffix
    new=$dir$stem.$suffix.$ext
    [[ -e $new ]] || break
  done

  echo "$old -> $new"
  olds+=("$old")
  news+=("$new")
  map+="$old"$'\t'"$new"$'\n'
done

if [[ ${#olds[@]} -eq 0 ]]; then
  echo "Nothing to rename."
  exit 0
fi

if $dry_run; then
  echo "Dry run: nothing changed."
  exit 0
fi

# Update every reference in one pass, longest paths first.
CB_MAP=$map perl -i -pe '
  BEGIN {
    %map = map { split /\t/ } split /\n/, $ENV{CB_MAP};
    $alt = join "|", map { quotemeta } sort { length $b <=> length $a } keys %map;
    $re = qr/$ENV{CB_BEFORE}($alt)$ENV{CB_AFTER}/;
  }
  s/$re/$map{$1}/g;
' "${sources[@]}"

for i in "${!olds[@]}"; do
  mv -- "${olds[$i]}" "${news[$i]}"
done

echo "Renamed ${#olds[@]} files and updated their references."
