require("dotenv").config();
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const db = require("./db");
const { router: authRouter } = require("./auth");
const todosRouter = require("./todos");

const secret = process.env.JWT_SECRET || "";
if (secret.length < 16 || secret.startsWith("change-me")) {
  console.error("Set a long random JWT_SECRET in .env (see .env.example).");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://todo:todo@localhost:5432/todo";
}

const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/todos", todosRouter);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use(express.static(path.join(__dirname, "../public")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
});

const port = process.env.PORT || 3000;
db.init()
  .catch((e) => {
    console.warn("Warning: PostgreSQL database connection failed at startup:", e.message);
  })
  .finally(() => {
    app.listen(port, () => console.log(`Today is running at http://localhost:${port}`));
  });


