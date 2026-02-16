# Creating a Client Review Bundle

Share the migration analysis with client collaborators for asynchronous review. The bundle is a standalone folder with no server or installation required.

## Build the bundle

```bash
node scripts/build-bundle.js
```

Output: `bundle/` folder containing:

- `index.html` — Single-page viewer (open in browser)
- `viewer.js` — Viewer logic
- `README.md` — Instructions for the client

## What's included

- All analysis documents (PROJECT_STRUCTURE, MODULE_CLASSIFICATIONS, etc.)
- Roadmap and critical path analysis
- User stories with effort estimates
- Figma prompts (JSON)
- Skills (for reference)
- Progress and objectives status

**Excluded** (for security or size):

- `analysis/SECURITY_FINDINGS.md`
- `archive/` (version history)
- `decompiled/` and `.apk` files

## Sharing options

### Option 1: Zip and send

```bash
cd /path/to/project
node scripts/build-bundle.js
zip -r migration-analysis-review.zip bundle/
```

Send `migration-analysis-review.zip` via email, file share, or client portal.

### Option 2: Cloud storage

Upload the `bundle/` folder to:

- Google Drive
- Dropbox
- OneDrive
- SharePoint
- Client's preferred platform

Share the folder link. Recipients open `index.html` from the shared folder.

### Option 3: Static web hosting

Deploy `bundle/` to any static host:

- **Netlify**: Drag-and-drop the folder or connect a repo
- **GitHub Pages**: Push `bundle/` to a `gh-pages` branch
- **Vercel**: Deploy the bundle folder
- **S3 / CloudFront**: Upload and enable static website hosting

Share the URL. Clients review in the browser with no download.

## Client instructions

Include this in your handoff:

1. **If you received a zip**: Unzip the file. Open `index.html` in your browser (double-click or File → Open).
2. **If you received a link**: Click the link. The viewer opens in your browser.
3. **Navigation**: Use the sidebar to view Progress, Objectives, Documents, and Stories. Click any document to read it.
4. **No login or install**: Works offline. No account or software required.

## Regenerating

Re-run the build script after updating analysis artifacts. The new bundle overwrites the previous one. Re-share the updated bundle when you have new content.
