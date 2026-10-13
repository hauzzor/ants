# Ants — Colony Simulator

A top-down 2D ant colony simulator that runs in the browser. You shape the
environment and manipulate ant behaviour, then watch the colony forage,
navigate, and perform — live.

Play the live version: https://hauzzor.github.io/ants/

## What it is

- **Top-down 2D** arena rendered on an HTML5 canvas.
- A **deterministic, seedable simulation core** (headless and fully unit-tested)
  drives ants that wander, follow pheromone gradients, carry food, and return home.
- The player manipulates behaviour indirectly by:
  - painting/erasing **attract** and **repel** pheromones,
  - placing/removing **food** sources,
  - drawing/erasing **walls** and obstacles,
  - spawning/removing **ants** and setting colony size,
  - tuning simulation **parameters** live (speed, pheromone decay/diffusion, sensing).
- A live **metrics HUD** reports food collected, food in nest, ants alive,
  elapsed time, and collection rate.

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev          # start the dev server (http://localhost:5173/ants/)
npm run build        # typecheck + production build into dist/
npm run preview      # preview the production build
npm test             # run unit/integration tests (Vitest)
npm run test:watch   # watch mode
npm run test:coverage
npm run test:e2e     # build + run browser tests (Playwright)
npm run validate     # typecheck + unit tests + build
```

On Windows PowerShell, if `npm` is blocked by the execution policy, use
`npm.cmd` (e.g. `npm.cmd test`).

### Browser tests

Install the Playwright browser once:

```bash
npx playwright install chromium
```

## Testing approach

This project is developed test-first. Simulation logic lives under `src/sim/`
and is kept free of DOM/canvas dependencies so it can be tested headlessly:

- unit tests cover the RNG, pheromone grid, world/walls/food, ant behaviour,
  metrics, and player tools, plus a determinism guarantee (same seed ⇒ same world),
- Playwright covers the browser smoke path (app loads, renders, simulation advances).

## Deployment

Pushing to `main` triggers GitHub Actions to test, build, and publish to
GitHub Pages. The Vite `base` is set to `/ants/` for project-page hosting.

## License

MIT (see `LICENSE`).
