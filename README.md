# Points

A Progressive Web App that counts the points of several persons, for example in card games.

- Add, edit and remove persons, each with a color. Swipe a person to the left to show Edit and Delete.
- Change the order of the persons: tap the order button and drag the handle of a person up or down.
- Count up from 0, or count down from a start value.
- Enter the points of a round with a keypad that has + and − keys, or use the buttons for steps of ±1, ±5 and ±10.
- Taps on the step buttons of one person add up to one entry. The sum shows next to the score. A new entry starts 3 s after the last tap, or when another person gets points.
- Undo the last entry. Start a new game with the same persons from the main screen.
- Open the protocol to see a chart of the scores over time and a list of all entries.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages on each push to `main`. The app is served at `https://pglira.github.io/points/`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
