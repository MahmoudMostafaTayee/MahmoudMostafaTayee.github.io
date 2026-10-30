# Portfolio — Mahmoud Mostafa Tayee

Static portfolio site: homepage plus four case studies. No build step, no framework,
no third-party requests (fonts are self-hosted, no analytics).

## Structure

```
index.html                      homepage: profile hero, experience, selected work, research,
                                background, contact
work/
  multi-camera-identity.html    URCA AI — cross-camera identity (13 cameras)
  streamtrack.html              MSc thesis — streams-and-tables MTMC (IEEE NILES 2026)
  cognitive-video-platform.html URCA AI — hybrid YOLO + VLM video analytics
  traffic-safety.html           Ottonomi AI — fall, wrong-way, lane-change, MCOT
assets/
  css/site.css                  single stylesheet, dark theme, print + reduced-motion rules
  js/site.js                    nav, reveal-on-scroll, TOC scrollspy, copy actions
  fonts/                        self-hosted Inter, Space Grotesk, JetBrains Mono
  img/                          portrait, OG card, favicon, STREAMTRACK figures
  Mahmoud_Mostafa_Tayee_CV.pdf  downloadable CV
404.html                        not-found page (root-relative links)
robots.txt, sitemap.xml, .nojekyll
```

Case-study pages live one level down and use `../` paths; `404.html` is served at
arbitrary depths by GitHub Pages, so it uses root-relative `/` paths instead.

## Preview locally

Any static server works:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

Opening `index.html` directly with `file://` also works, but relative font preloads
and the CV download behave more predictably over HTTP.

## Deploy (GitHub Pages)

The canonical URL in the markup is `https://mahmoudmostafatayee.github.io/`.

```sh
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin git@github.com:MahmoudMostafaTayee/MahmoudMostafaTayee.github.io.git
git push -u origin main
```

Pushing to the `MahmoudMostafaTayee.github.io` repository publishes the site at the
root URL. If you host it under a project repository instead, update the canonical and
`og:url` values in `index.html`, the four case studies, and `sitemap.xml`.

## Editing notes

- Headline metrics (9.8×, 4.16×, 337 ms, 64–72 streams, −76% boot) also appear in the
  homepage hero, the work cards, and the case studies. Change them in every place they
  appear, or the page contradicts itself.
- Case studies are diagram-led on purpose: client work is described without showing
  captured footage. Only STREAMTRACK uses images, and those come from public datasets
  (WTS, NVIDIA SmartSpaces).
- The CV in `assets/` is a copy. Rebuild from `cv/CV/Mahmoud_Mostafa_Tayee.tex` and copy
  the PDF over when the CV changes.
