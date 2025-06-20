# Toska book club

This app is a vibe-coded book club app.

See [feats.md](docs/feats.md) for description of features.

Running

- Do `npm run dev` in root to run it. Requires docker.

Tests

- `npm test` to run tests and keep watching files and rerunning tests
- `npm run test:run` to run tests and exit
- `vitest run path/to/file.test.ts` for single file

Db

- Migrations have to be run inside docker. In repository root, use `npm run migrate:up` and `migrate:down` for running migrations.

Make issues or PR's to give ideas or contributions.
