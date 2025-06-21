# 📚 Toska Book Club

A vibe-coded book club app for small groups (5–20 members).  
Suggest books ➡️ vote together ➡️ see what wins. All phases are managed with clear deadlines.  
Built with Docker, tested with Vitest.

![Results image](docs/results.png)

---

## 🚀 Features

- 🧾 **Book suggestions**: One per user, with title & author required.
- 🗳️ **Voting**: Vote for any number of suggestions before the deadline.
- 🏆 **Results**: Sorted by votes, anonymously.
- 🔐 **Auth**: JWT-based login (12h expiry), roles: `admin` / `user`.
- 🛠️ **Admin powers**: Start a new round by setting suggestion & voting deadlines.

See full list: [docs/feats.md](docs/feats.md)

---

## 🛠️ Getting Started

Make sure Docker is running.

### ▶️ Run the app

```bash
npm run dev
```

### 🧪 Run tests

```bash
npm test            # Watch mode
npm run test:run    # One-off test run
vitest run path/to/file.test.ts  # Single test file
```

---

## 🧰 Commands

### 🔄 Development

- `npm run dev` – Start backend & frontend (with Docker)
- `npm run install:backend` – Install backend deps inside Docker
- `npm run install:frontend` – Install frontend deps inside Docker

### 🗃️ Database

- `npm run migrate:up` – Run latest DB migrations
- `npm run migrate:down` – Revert last DB migration
- `npm run init-test-data` – Load test data into DB
- `npm run pgcli` – Open Postgres CLI (requires [pgcli](https://github.com/dbcli/pgcli) to be installed. For example, `sudo apt install pgcli` may work)

### ✅ Tests

- `npm test` – Run tests in watch mode
- `npm run test:run` – Run all tests once
- `npm run test:api` – Run backend tests

---

## 💡 Future Ideas

- 🔢 Rank-based voting
- ⭐ Book feedback/rating phase
- 🧑‍🤝‍🧑 Multi-club support with roles:

  - 🧙 Superadmin (manage all clubs)
  - 👩‍💼 Club manager (admin of one club)

---

Contribute with issues or PRs – we welcome ideas! ✨
