#!/bin/bash
set -euo pipefail

# -------------------------------
# 1. OMGEVING & CONFIG
# -------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/private/config.php"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: config.php niet gevonden."
    exit 1
fi

# Functie voor de pauze
pause() {
    local message=${1:-"Task"}
    local timeout=60
    echo -e "\n\033[0;33m[PAUZE] '$message' voltooid. Druk op [Enter] om de volgende stap te starten (auto na $timeout seconden)...\033[0m"

    for ((i=timeout; i>0; i--)); do
        printf "\r\033[0;36mTime remaining: %2ds\033[0m" $i
        # read met timeout van 1 seconde
        if read -t 1 -r; then
            # Enter gedrukt, stop countdown
            break
        fi
    done
    printf "\n"
}

# Haal paden op en strip alle whitespace/newlines
NZB_IMPORT_ROOT=$(php -r "require '$CONFIG_FILE'; echo trim(NZB_IMPORT_FOLDER);" | tr -d '\r\n')
PHP_BIN=$(php -r "require '$CONFIG_FILE'; echo defined('PHP_BINARY') ? PHP_BINARY : 'php';" | tr -d '\r\n')
SCRIPT_DIR_PHP="${PROJECT_ROOT}/bin"

echo "----------------------------------------------------"
echo ">>> Start NZBarr 2.0 Smart Pipeline (Category Mode)"
echo ">>> Root Import Folder: $NZB_IMPORT_ROOT"
echo "----------------------------------------------------"

# Definieer categorieën en hun submappen in aparte arrays voor compatibiliteit.
CATEGORY_NAMES=( "TV" "Movies" "Music" "Books" "Games" "Anime" )
CATEGORY_ALIASES=(
    "TV,Series,Televisie"
    "Movies,Films"
    "Music,Muziek"
    "Books,Boeken"
    "Games,Spellen"
    "Anime"
)

# -------------------------------
# 2. VERWERK & IMPORTEER LOOP
# -------------------------------

for i in "${!CATEGORY_NAMES[@]}"; do
    category_name=${CATEGORY_NAMES[$i]}
    folder_aliases_csv=${CATEGORY_ALIASES[$i]}
    IFS=',' read -ra folder_aliases <<< "$folder_aliases_csv"
    
    for subfolder_name in "${folder_aliases[@]}"; do
        TARGET_FOLDER="$NZB_IMPORT_ROOT/$subfolder_name"

        if [ -d "$TARGET_FOLDER" ]; then
            if [ -z "$(ls -A "$TARGET_FOLDER")" ]; then
                echo -e "\n-- Sla lege categorie map over: $subfolder_name"
                continue
            fi

            echo -e "\n\033[1;34m>>> Verwerk Categorie: $category_name in map: $TARGET_FOLDER\033[0m"

            # Categorie-specifieke verwerking
            case $category_name in
                "TV")
                    echo "Stap 1: Opschonen van algemene tekst in NZB namen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/rename-nzb.php" "$TARGET_FOLDER"
                    echo "Stap 2 [TV]: Normaliseren aflevering-notatie (1x01 -> S01E01)..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/1x01-to-S01E01.php" "$TARGET_FOLDER"
                    echo "Stap 3 [TV]: Jaartal verplaatsen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/move-release-year.php" "$TARGET_FOLDER"
                  #  echo "Stap 4 [TV]: IMDB ID's toevoegen/controleren..."
                  #  "$PHP_BIN" "$SCRIPT_DIR_PHP/addimdbtonzb.php" "$TARGET_FOLDER"
                    echo "Stap 5 [TV]: TMDB ID's toevoegen/herformatteren..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/addTMDBtonzb.php" "$TARGET_FOLDER"
                    ;;
                "Movies")
                    echo "Stap 1: Opschonen van algemene tekst in NZB namen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/rename-nzb.php" "$TARGET_FOLDER"
                    echo "Stap 2 [Movies]: Jaartal verplaatsen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/move-release-year.php" "$TARGET_FOLDER"
                    echo "Stap 3 [Movies]: IMDB ID's toevoegen/controleren..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/addimdbtonzb.php" "$TARGET_FOLDER"
                    echo "Stap 4 [Movies]: TMDB ID's toevoegen/herformatteren..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/addTMDBtonzb.php" "$TARGET_FOLDER"
                    ;;
                "Music")
                    echo "Stap 1.5 [Music]: Hernoemen naar Artist - Album formaat..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/rename-music-nzb.php" "$TARGET_FOLDER"
                    echo "Stap 2 [Music]: Muziek NZBs taggen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/tag_music_nzbs.php" "$TARGET_FOLDER"
                    ;;
                "Books")
                    echo "Stap 2 [Books]: Boek NZBs taggen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/tag_book_nzbs.php" "$TARGET_FOLDER"
                    ;;
                "Games")
                    echo "Stap 2 [Games]: Game NZBs taggen..."
                    "$PHP_BIN" "$SCRIPT_DIR_PHP/tag_game_nzbs.php" "$TARGET_FOLDER"
                    ;;
            esac
            
            # Generieke nabewerking
            echo "Stap Laatste (voor import): Bestandsnamen controleren/verfijnen..."
            "$PHP_BIN" "$SCRIPT_DIR_PHP/normalize-nzb.php" "$TARGET_FOLDER"
            echo "Stap Laatste+1: Ongewenste bestanden verplaatsen naar BIN..."
            "$PHP_BIN" "$SCRIPT_DIR_PHP/movetobin.php" "$TARGET_FOLDER"

            pause "Voorbewerking voor $category_name ($subfolder_name)"

            # Importeer stap voor deze categorie
            echo "Importeren van $category_name releases uit $TARGET_FOLDER..."
            # Let op: import.php moet worden aangepast om argumenten te accepteren!
            "$PHP_BIN" "$SCRIPT_DIR_PHP/import.php" "$TARGET_FOLDER" "$category_name"
            
            pause "Import voor $category_name ($subfolder_name)"
        fi
    done
done

# -------------------------------
# 3. GLOBALE METADATA FETCH
# -------------------------------

echo -e "\n\033[1;34m>>> Start Globale Metadata Fetch voor alle nieuwe releases\033[0m"

echo "Stap 1: Metadata ophalen (Covers, Plots, etc)..."
"$PHP_BIN" "$SCRIPT_DIR_PHP/fetch_metadata.php"
pause "Metadata Fetch"

echo "Stap 2: Aflevering details ophalen..."
"$PHP_BIN" "$SCRIPT_DIR_PHP/fetch_episodes.php"
pause "Episode Fetch"

echo "Stap 3: Releases analyseren (NFO, Mediainfo)..."
"$PHP_BIN" "$SCRIPT_DIR_PHP/analyze_releases.php" --download-all --max-mb=10 --resume --force
pause "Release Analyse"

echo "----------------------------------------------------"
echo ">>> Pipeline volledig voltooid!"
echo "----------------------------------------------------"