# Zafar Abdullaev’s desktop portfolio

## Open in IntelliJ

1. Extract the upgraded ZIP into a new location. In IntelliJ, choose **File → Open** and select the extracted `Zafar_Abdullaev_personal-website` folder.
2. Open `index.html` at the project root. Right-click it and choose **Open In → Browser → Chrome**, or use the browser icon in the editor. IntelliJ’s built-in web server serves the relative asset paths and PDF.
3. If you prefer to open it without IntelliJ, run `python3 -m http.server 4173` inside the project folder and visit `http://localhost:4173/`.

There are no build steps or runtime dependencies. The original ZIP is the recoverable backup. Extract it to a separate folder and open `.idea/index.html` there to view the previous version.

## Edit the site

- **`index.html`** holds the folder templates, project write-ups, photo captions and app controls. Add a unique `data-topic` to a section to include it in search and use `data-anchor` to link directly to it from another window.
- **`desktop.js`** maps folder IDs to their open windows. Each window retains its own content and geometry. The taskbar restores minimised windows, and the layout fits saved rectangles to the viewport.
- **`apps.js`** indexes the templates for search, uses native modal dialogs for search and photos, and applies appearance settings. One audio element plays tracks from local object URLs so music continues while windows change.
- **`style.css`** holds the desktop layout, mobile rules, focus states and reduced-motion treatment.

The photos and SDR CV came from the supplied project. The three wallpapers are original to this version of the site. Pixelify Sans came from the [Google Fonts source directory](https://github.com/google/fonts/tree/main/ofl/pixelifysans). Its [SIL Open Font License](assets/fonts/OFL.txt) is bundled. The two cartoon reference JPEGs have no reuse information in the supplied project. The new gallery preserves the poses in the captions, and the JPEGs remain in the original ZIP.

The Music app starts with an empty playlist. Choose audio files, then press **Play**. The browser reads them locally and the playlist lasts for the current tab session. The CV panel includes a download and a separate-tab link for browsers without an inline PDF viewer.
