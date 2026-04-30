# Filename Guide

NZBarr works best when NZB filenames contain enough information to identify the movie or TV show before import.

## Screenshot Placeholder

Add screenshots of prepared filenames, Browse rows, and release detail metadata here.

## Recommended Movie Pattern

```text
Movie Title (2024) [2160P-WEB-DL-DTS-HD-MA-H.265-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

Important parts:

- `Movie Title`: readable title.
- `(2024)`: release year.
- `[2160P-WEB-DL-DTS-HD-MA-H.265-GROUP-mkv]`: technical metadata.
- `[imdb-tt1234567]`: IMDb ID.
- `[tmdb-12345]`: TMDB ID.

## Recommended TV Episode Pattern

```text
Show Title [S01E02] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

Use `S01E02` for season 1, episode 2.

## Complete TV Season Pattern

```text
Show Title [S01] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

Use `S01` for a complete season.

## Specials And Complete Series

Specials:

```text
Show Title [S00] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

Complete series:

```text
Show Title [S99] (2024) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
```

## Good Examples

```text
Example Movie (2024) [2160P-WEB-DL-TrueHD7.1-H.265-GROUP-mkv] [imdb-tt1234567] [tmdb-12345].nzb
Example Show [S02E05] (2023) [1080P-WEB-DL-DD5.1-H.264-GROUP-mkv] [imdb-tt7654321] [tmdb-98765].nzb
Example Show [S03] (2022) [1080P-BluRay-DTS-H.264-GROUP-mkv] [imdb-tt7654321] [tmdb-98765].nzb
```

## Weak Examples

```text
movie.final.real.2160p.nzb
show.latest.episode.nzb
Title.With.No.Year.Or.ID.nzb
```

These may still import, but matching can be wrong or incomplete.

## Why IDs Matter

IMDb and TMDB IDs are strongly recommended because:

- Different movies can share the same title.
- Remakes can have the same title and different years.
- TV shows can have regional titles.
- Some NZB names include extra scene or provider tags.

If matching fails, adding `[imdb-tt...]` or `[tmdb-...]` is usually the fastest fix.

## Release Groups

You can add known release groups in `Settings > Release Groups`.

Add one group per line:

```text
FLUX
NTb
AMCON
```

When NZBarr recognizes a group in the filename, it can fill release group metadata automatically.
