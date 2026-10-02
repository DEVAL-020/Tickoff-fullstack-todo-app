const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: true } : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  init: () => pool.query(fs.readFileSync(path.join(__dirname, "../schema.sql"), "utf8")),
};
