require("dotenv").config();
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://todo:todo@localhost:5432/todo";
}

const app = require("./app");
const db = require("./db");
const port = process.env.PORT || 3000;

if (require.main === module) {
  db.init()
    .catch((e) => {
      console.warn("Warning: PostgreSQL database connection failed at startup:", e.message);
    })
    .finally(() => {
      app.listen(port, () => console.log(`Today is running at http://localhost:${port}`));
    });
}

module.exports = app;


