# TMDB Setup

NZBarr can use TMDB to match movies and TV shows, fetch metadata, and download artwork. NZBarr does not include a TMDB API key. Each user must enter their own key in Settings.

## Why TMDB Is Recommended

TMDB helps NZBarr:

- Match messy NZB filenames to the correct movie or TV show.
- Resolve remakes and titles with the same name.
- Find IMDb and TMDB IDs.
- Download posters, backdrops, logos, and cast images.
- Improve Smart Preparation results before import.

NZBarr can still import NZB files without TMDB, but matching and artwork will be limited.

## Get A TMDB API Key

1. Create or sign in to your TMDB account.
2. Open the TMDB API settings page.
3. Request or copy your API key.
4. Keep the key private.

The exact TMDB website screens may change over time, so follow TMDB's current instructions if the labels differ.

## Add The Key In NZBarr

1. Open NZBarr.
2. Go to `Settings`.
3. Open `API Keys`.
4. Paste your key into `TMDB API Key`.
5. Click `Save Settings`.

After saving, Smart Preparation, manual TMDB search, metadata refresh, and artwork downloads can use the key.

## Fanart.tv Key

The `Fanart API Key` is optional. It is used only for extra artwork from Fanart.tv, such as alternate covers, backdrops, or logos.

## Privacy Notes

Your API keys are stored in the local NZBarr settings database on your computer. Do not commit screenshots or database files that show your private API keys.

## TMDB Attribution

NZBarr does not include TMDB artwork or a TMDB API key. Artwork is loaded only when a user enters their own TMDB API key. NZBarr is not endorsed, certified, or otherwise approved by TMDB.

## Troubleshooting

If TMDB matching does not work:

- Check that the API key was saved.
- Restart NZBarr after saving the key.
- Try a filename with a clear title and year.
- Add an IMDb or TMDB ID to the filename if the title is ambiguous.
- Check your internet connection.
