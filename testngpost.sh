#!/bin/zsh

SRC="/Volumes/MEDIA-MyBook/TVShows/Las Vegas (2003) HDTV-720p x264 AAC {Tmdb-2389} {Imdb-tt0364828}/Season 1"
OUT="/Users/hermansteijn/Downloads/NZBNEWZNAB/11test/nzbarrimport/Series"
TMP="/Users/hermansteijn/Downloads/NZBNEWZNAB/11test/ngpost-groups"
PASS="Hgdkkhgˆ7ss!}!!"
GROUPS="4u.alt.binaries.4u"

NGPOST="/Applications/ngPost.app/Contents/MacOS/ngPost"
DRY_RUN="${DRY_RUN:-1}"
MAX_GROUPS="${MAX_GROUPS:-0}"

strip_password_meta() {
  local nzb="$1"
  [ -f "$nzb" ] || return 0

  perl -0pi -e 's/\s*<meta[^>]*type="password"[^>]*>.*?<\/meta>\s*/\n/gis' "$nzb"
}

if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run: planned groups from $SRC"
  for file in "$SRC"/*; do
    [ -f "$file" ] || continue
    name="$(basename "$file")"
    base="${name%.*}"
    base="${base%-thumb}"
    printf "%s\t%s\n" "$base" "$name"
  done | sort | awk -F '\t' '
    $1 != current {
      if (NR > 1) print "";
      current = $1;
      print "NZB: " current ".nzb";
    }
    { print "  - " $2 }
  '

  echo
  echo "Dry run only. To post, run:"
  echo "  DRY_RUN=0 ./testngpost.sh"
  echo "For a small test, run:"
  echo "  DRY_RUN=0 MAX_GROUPS=1 ./testngpost.sh"
  exit 0
fi

rm -rf "$TMP"
mkdir -p "$TMP" "$OUT"

for file in "$SRC"/*; do
  [ -f "$file" ] || continue

  name="$(basename "$file")"
  base="${name%.*}"
  base="${base%-thumb}"

  mkdir -p "$TMP/$base"
  cp -p "$file" "$TMP/$base/"
done

echo "Prepared groups:"
find "$TMP" -mindepth 1 -maxdepth 1 -type d | sort | while read -r groupdir; do
  echo
  echo "NZB: $(basename "$groupdir").nzb"
  find "$groupdir" -maxdepth 1 -type f -print | sed 's#^.*/#  - #'
done

posted=0
for groupdir in "$TMP"/*; do
  [ -d "$groupdir" ] || continue
  if [ "$MAX_GROUPS" -gt 0 ] && [ "$posted" -ge "$MAX_GROUPS" ]; then
    break
  fi

  base="$(basename "$groupdir")"

  "$NGPOST" \
    -g "$GROUPS" \
    -i "$groupdir" \
    -o "$OUT/$base.nzb" \
    --compress \
    --gen_name \
    --rar_pass "$PASS" \
    --rar_size 99 \
    --par2_pct 1 \
    --rar_no_root_folder \
    --obfuscate

  strip_password_meta "$OUT/$base.nzb"

  posted=$((posted + 1))
done
