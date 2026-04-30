<p align="center">
  <img src="https://nzbarr.com/nzbarr-logo-classic.svg" width="180"/>
</p>

<h1 align="center">NZBarr</h1>

<p align="center">
  A desktop library for NZB files — organize, enrich, and manage your NZB collection with ease.
</p>

<p align="center">
  <a href="https://nzbarr.com">
    <img src="https://img.shields.io/badge/Website-nzbarr.com-C9A646?style=for-the-badge&logoColor=black"/>
  </a>
</p>

---

## 💛 Support NZBarr

If you find **NZBarr** useful, consider supporting its development.  
Your contribution helps cover hosting, energy costs, and ongoing improvements.

<p align="center">
  <a href="https://nzbarr.com">
    <img src="https://img.shields.io/badge/Support-NZBarr-C9A646?style=for-the-badge&logoColor=black" />
  </a>
</p>

---

## 📦 What is NZBarr?

NZBarr is a desktop library for NZB files. It lets you keep a small local media library made from NZBs, enrich it with movie and TV metadata, and send items to a downloader when you want to use them.

NZBarr does **not** include media, Usenet access, indexers, or downloader software.  
You need your own Usenet provider, NZB files, and optional downloader setup.

---

## 🚀 Features

- Import `.nzb` and `.nzb.gz` files into a local SQLite library  
- Organize NZBs as movies, TV episodes, seasons, or other releases  
- Match content with TMDB and IMDb IDs  
- Download and cache artwork (posters, backdrops, logos)  
- Browse, search, and group your library  
- Manual linking for unmatched content  
- Send NZBs to SABnzbd or NZBGet  
- Import direct stream URLs  
- Use external players (VLC, IINA, MPV)  
- Refresh/repost workflow with SABnzbd + ngPost  

---

## 🔄 Best NZB Import Workflow

1. Put NZB files in preparation folders  
2. Run **Smart Preparation**  
3. Let NZBarr clean filenames  
4. Use **Prepare + Import**  

Raw NZB filenames are often messy. Smart Preparation normalizes them for better matching.

---

## ⚙️ Smart Preparation

`Settings > Import & Link > Smart Preparation`

Configure:
- Movies Preparation Folder  
- TV Preparation Folder  

Options:
- `Prepare Folders`
- `Prepare + Import`

💡 Tip: Add a TMDB API key for best results.

---

## 📥 Drag & Drop Import

Use only for already clean filenames.

**Recommended:**
- Smart Preparation → normal use  
- Prepare + Import → safest workflow  
- Drag & Drop → only for clean files  

---

## 🏷️ Filename Pattern

**Movie:**
```text
Movie Title (2024) [2160P-WEB-DL...] [imdb-tt1234567] [tmdb-12345].nzb
