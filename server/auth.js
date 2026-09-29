const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("./db");

const router = express.Router();
const COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

const sign = (id) => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const DUMMY = bcrypt.hashSync("not-a-real-password", 12);

const WELCOME = [
  ["Write your first task on the sticky note", "Work", 1],
  ["Tick me off to see the pen check", "Home", 0],
  ["Drag tasks to reorder them", "Study", 1],
];

router.post("/register", limiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || name.length > 40) {
    return res.status(400).json({ error: "Enter your name (40 characters max)." });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be 8 to 72 characters." });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      "insert into users (name, email, password_hash) values ($1, $2, $3) returning id, name, email",
      [name, email, hash]
    );
    const user = rows[0];

    for (const [i, [text, cat, pri]] of WELCOME.entries()) {
      await db.query(
        "insert into todos (user_id, text, cat, pri, position) values ($1, $2, $3, $4, $5)",
        [user.id, text, cat, pri, i]
      );
    }
    res.cookie("token", sign(user.id), COOKIE).status(201).json({ user: publicUser(user) });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "That email is already registered. Try signing in." });
    }
    throw e;
  }
});

router.post("/login", limiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const { rows } = await db.query("select * from users where lower(email) = $1", [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY);

  if (!user || !ok) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.cookie("token", sign(user.id), COOKIE).json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { ...COOKIE, maxAge: undefined }).json({ ok: true });
});

router.get("/me", async (req, res) => {
  try {
    const { sub } = jwt.verify(req.cookies.token || "", process.env.JWT_SECRET);
    const { rows } = await db.query("select id, name, email from users where id = $1", [sub]);
    if (!rows[0]) throw new Error("no user");
    res.json({ user: rows[0] });
  } catch (e) {
    res.status(401).json({ error: "Not signed in." });
  }
});

function requireAuth(req, res, next) {
  try {
    req.userId = jwt.verify(req.cookies.token || "", process.env.JWT_SECRET).sub;
    next();
  } catch (e) {
    res.status(401).json({ error: "Please sign in." });
  }
}

module.exports = { router, requireAuth };

