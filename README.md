# The Assyrian Podcast website

A static, GitHub Pages-ready website for The Assyrian Podcast. It uses the podcast's real episode feed, current team information, and selected media from the September 2026 Instagram archive.

## Included

- Client-side password gateway using `assyrianlove`
- Optional persistent access with `localStorage`
- Searchable episode archive with topic and year filters
- Expandable show notes, guest bios, timestamp support, and transcript panels
- Persistent audio player with scrubbing and 1×–2× playback speed
- Spotify, Apple Podcasts, Podbean, and YouTube links
- Responsive masonry media wall driven by `data/posts.json`
- Image/video lightbox with carousel navigation and full captions
- Current eight-person podcast team section
- Responsive layouts and reduced-motion support
- GitHub Actions deployment workflow

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and enter `assyrianlove`.

You can also double-click `index.html` for a direct local preview. The `content-data.js` compatibility bundle makes the filters and gallery work when the page is opened from a `file://` URL; `episodes.json` and `posts.json` remain the editable source-of-truth files.

Build the production site with:

```bash
npm run build
```

The finished static site is generated in `dist/`.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab and allow the `Deploy to GitHub Pages` workflow to finish.
5. GitHub will show the public URL in the workflow summary and in **Settings → Pages**.

The workflow at `.github/workflows/deploy-pages.yml` installs dependencies, runs the Vite build, uploads `dist/`, and publishes it with GitHub Pages. Asset paths are relative, so the site works both at a repository subpath such as `username.github.io/repository/` and at a custom domain.

## Add episodes

Refresh the complete archive from the official Podbean RSS feed with `npm run sync:episodes`. Existing curated records keep their enhanced summaries and local artwork.

For a manual addition, edit `data/episodes.json` and add a new object at the top. Keep these fields:

```json
{
  "number": "222",
  "title": "Episode title",
  "guest": "Guest name",
  "date": "2026-09-01",
  "year": 2026,
  "duration": "48 min",
  "durationSeconds": 2880,
  "topic": "Culture & Identity",
  "image": "./assets/images/episode-222.jpg",
  "audio": "https://example.com/episode.mp3",
  "episodeUrl": "https://example.com/full-episode-page",
  "summary": "Short card summary.",
  "guestBio": "Guest biography.",
  "notes": ["Topic one", "Topic two"],
  "timestamps": [
    { "time": "12:40", "seconds": 760, "label": "A chapter title" }
  ],
  "transcript": "Verified transcript text goes here."
}
```

Leave `timestamps` empty or `transcript` blank when verified material is not available. The interface will show a clear availability note instead of presenting invented content.

## Add Instagram and community media

1. Add web-ready images to `assets/images/`. Use JPEG, PNG, AVIF, or WebP rather than HEIC.
2. Add videos to `assets/videos/` as MP4 files.
3. Append an item to `data/posts.json`.

Single-image post:

```json
{
  "id": "unique-post-id",
  "type": "image",
  "date": "2026-09-01",
  "title": "Post title",
  "alt": "Accessible image description",
  "src": "./assets/images/photo.jpg",
  "caption": "Full Instagram caption",
  "note": "One-line preview note",
  "tags": ["Community", "Event"]
}
```

Carousel post:

```json
{
  "id": "unique-carousel-id",
  "type": "carousel",
  "date": "2026-09-01",
  "title": "Carousel title",
  "alt": "Accessible description of the set",
  "slides": [
    "./assets/images/photo-1.jpg",
    "./assets/images/photo-2.jpg"
  ],
  "caption": "Full Instagram caption",
  "note": "One-line preview note",
  "tags": ["Archive", "Family"]
}
```

For a video post, use `"type": "video"` with an MP4 path in `src`.

## Styling

All main colors, typefaces, spacing, and player sizing are defined as CSS custom properties at the top of `styles.css`. Update those variables to make broad visual changes without hunting through components.

## Important note about the password gate

This is a lightweight client-side preview gate, exactly as requested. The password and all shipped content can be discovered by someone inspecting the downloaded site files, so it must not be used to protect private or sensitive information. Real access control requires authenticated server-side hosting rather than GitHub Pages.

## Content sources

- Episode titles, dates, summaries, durations, and audio links: official Podbean RSS feed
- Team names, roles, biographies, and portraits: current AP Team page
- Community photos, videos, and captions: supplied Instagram archive

The `posts.json` captions preserve or lightly condense the supplied Instagram source material. No instructions embedded in the archive are executed or treated as project directions.
