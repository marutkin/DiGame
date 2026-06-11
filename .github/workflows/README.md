# GitHub Pages Deployment

This folder contains the workflow to automatically build and deploy the game to GitHub Pages.

## How it works

- On every push to `main` → the site is built and deployed to GitHub Pages (production).
- On every Pull Request → the game is built (you get a green check if the build succeeds). This acts as a "preview".
- You can also manually trigger the workflow from the **Actions** tab.

## Required GitHub Settings (one-time)

1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (in the left sidebar).
3. Under "Build and deployment":
   - **Source** → select **GitHub Actions**
4. Save.

After this, the next push to `main` (or manual run) will publish the game.

## Preview on Pull Requests

When you open a PR:
- The `build` job runs automatically.
- If it passes, the built game is available as an artifact.
- You can download the artifact from the PR → "Actions" tab → the "build" job → "Upload artifact" step to test the game locally.

If you want **real hosted preview URLs** for every PR (e.g. `https://yourname.github.io/digame-excalibur/previews/pr-42/`), let me know and we can add a second workflow using a `gh-pages` branch.

## Build output

The workflow runs `npm run build`, which executes:
- `npm run setup:assets` (copies assets from `user_assets/` to `public/assets/`)
- `vite build` (outputs to the `docs/` folder)

This matches your current `vite.config.ts` setup.
