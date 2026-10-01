const app = require("../server/app");
const db = require("../server/db");

let initialization;

module.exports = async (req, res) => {
  if (!initialization) {
    initialization = db.init().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
  return app(req, res);
};