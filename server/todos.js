const express = require("express");
const db = require("./db");
const { requireAuth } = require("./auth");

const router = express.Router();
const CATS = ["Work", "Home", "Study", "Health"];
const COLS = "id, text, cat, pri, done";
router.use(requireAuth);

const clean = (b, partial) => {
  const out = { text: null, done: null, cat: null, pri: null };
  if (b.text !== undefined || !partial) {
    const t = String(b.text ?? "").trim();
    if (!t || t.length > 120) {
      return { error: "Task text must be 1 to 120 characters." };
    }
    out.text = t;
  }
  if (b.cat !== undefined) {
    if (!CATS.includes(b.cat)) {
      return { error: "Unknown category." };
    }
    out.cat = b.cat;
  }
  if (b.pri !== undefined) {
    if (![0, 1, 2].includes(b.pri)) {
      return { error: "Priority must be 0, 1 or 2." };
    }
    out.pri = b.pri;
  }
  if (b.done !== undefined) {
    if (typeof b.done !== "boolean") {
      return { error: "done must be true or false." };
    }
    out.done = b.done;
  }
  return { value: out };
};

router.get("/", async (req, res) => {
  const { rows } = await db.query(
    `select ${COLS} from todos where user_id = $1 order by position, id`,
    [req.userId]
  );
  res.json({ todos: rows });
});

router.post("/", async (req, res) => {
  const { value, error } = clean(req.body, false);
  if (error) return res.status(400).json({ error });
  const { rows } = await db.query(
    `insert into todos (user_id, text, cat, pri, position)
     values ($1, $2, coalesce($3, 'Work'), coalesce($4, 1),
       (select coalesce(min(position), 0) - 1 from todos where user_id = $1))
     returning ${COLS}`,
    [req.userId, value.text, value.cat, value.pri]
  );
  res.status(201).json({ todo: rows[0] });
});

router.put("/reorder", async (req, res) => {
  const ids = req.body.ids;
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(Number.isInteger)) {
    return res.status(400).json({ error: "ids must be a list of task ids." });
  }
  await db.query(
    `update todos set position = x.pos from unnest($1::int[]) with ordinality as x(id, pos)
     where todos.id = x.id and todos.user_id = $2`,
    [ids, req.userId]
  );
  res.json({ ok: true });
});

router.delete("/completed", async (req, res) => {
  await db.query("delete from todos where user_id = $1 and done", [req.userId]);
  res.json({ ok: true });
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Bad task id." });
  const { value, error } = clean(req.body, true);
  if (error) return res.status(400).json({ error });
  const { rows } = await db.query(
    `update todos set text = coalesce($3, text), done = coalesce($4, done), cat = coalesce($5, cat), pri = coalesce($6, pri)
     where id = $1 and user_id = $2 returning ${COLS}`,
    [id, req.userId, value.text, value.done, value.cat, value.pri]
  );
  if (!rows[0]) return res.status(404).json({ error: "Task not found." });
  res.json({ todo: rows[0] });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Bad task id." });
  await db.query("delete from todos where id = $1 and user_id = $2", [id, req.userId]);
  res.json({ ok: true });
});

module.exports = router;

