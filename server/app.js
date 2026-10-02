const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { router: authRouter } = require("./auth");
const todosRouter = require("./todos");

const secret = process.env.JWT_SECRET || "";
if (secret.length < 32 || secret.startsWith("change-me")) {
  throw new Error("Set a random JWT_SECRET with at least 32 characters.");
}

const app = express();
app.set("trust proxy", 1);
const sameOriginMutation = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  try {
    const origin = new URL(req.get("origin"));
    const expected = new URL(`${req.protocol}://${req.get("host")}`);
    if (origin.origin === expected.origin && req.get("sec-fetch-site") !== "cross-site") {
      return next();
    }
  } catch (e) {
    // Requests without a valid browser origin are not allowed to mutate state.
  }
  res.status(403).json({ error: "Request origin is not allowed." });
};
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
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

app.use("/api", sameOriginMutation);
app.use("/api/auth", authRouter);
app.use("/api/todos", todosRouter);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
app.use(express.static(path.join(__dirname, "../public")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Try again." });
});

module.exports = app;