# Today

A handwritten-notebook to-do app with accounts. React, Framer Motion and GSAP on the front end, Express and PostgreSQL on the back end.

- Sign up and sign in, with passwords hashed by bcrypt and a 7-day session in an httpOnly cookie
- Tasks belong to each user: add, edit, tick off, delete, drag to reorder, clear finished
- Fluid animated background, light and dark mode, works on mobile

## Run it locally

You need Node 18+ and a PostgreSQL database.

```bash
docker compose up -d                 # starts Postgres (or use your own)
cp .env.example .env                 # then set JWT_SECRET (command inside the file)
npm install
npm start                            # http://localhost:3000
```

Tables are created automatically on start from `schema.sql`.

## Project layout

```
server/      Express API (auth.js, todos.js, db.js, index.js)
client/      React source (app.jsx)
public/      What the browser loads (index.html, style.css, app.js)
schema.sql   Database tables
```

`public/app.js` is the compiled version of `client/app.jsx`. After editing the client, run `npm run build`.

## API

| Method | Path | What it does |
| --- | --- | --- |
| POST | /api/auth/register | Create account (name, email, password) |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/logout | Sign out |
| GET | /api/auth/me | Current user |
| GET / POST | /api/todos | List / add a task |
| PATCH / DELETE | /api/todos/:id | Update / delete a task |
| PUT | /api/todos/reorder | Save order (`{ ids: [...] }`) |
| DELETE | /api/todos/completed | Remove finished tasks |

## Deploy

Works on Render, Railway, Fly.io or any Node host. Set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and `PGSSL=true` if your database requires SSL. Serve it over HTTPS so the session cookie is sent as secure.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` and `node_modules` are already in `.gitignore`.

## Security notes

Login and register are rate limited, inputs are validated on the server, and all queries are parameterized. Sessions use `SameSite=Lax` cookies. If you later add a separate front-end domain, add CSRF tokens.
