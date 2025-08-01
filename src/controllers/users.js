const {
  getAllUsersService,
  updateUserService,
  deleteUserService,
} = require("../services/db");
const parseJSON = require("../utils/parseJSON");

/*
 * GET /api/users
 * Status 200, 500
 */
async function getAllUsers(req, res) {
  try {
    const users = await getAllUsersService();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(users));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// PATCH /api/users/:id
async function updateUser(req, res) {
  const match = req.url.match(/^\/api\/users\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400);
    return res.end();
  }

  let body;
  try {
    body = await parseJSON(req);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  const { role } = body;
  if (role !== "admin" && role !== "member") {
    res.writeHead(400);
    return res.end();
  }

  try {
    const updated = await updateUserService(id, role);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(updated));
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end();
  }
}

/*
 * DELETE /api/users/:id
 * 204 → succes
 * 400, 404, 500
 */
async function deleteUser(req, res) {
  const match = req.url.match(/^\/api\/users\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    return res.writeHead(400).end();
  }

  try {
    const deleted = await userRepo.deleteUser(id);

    if (!deleted) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "User not found" }));
    }

    res.writeHead(204);
    res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

module.exports = function registerUsersRoutes(router) {
  router.add("GET", /^\/api\/users$/, getAllUsers);
  router.add("PATCH", /^\/api\/users\/\d+$/, updateUser);
  router.add("DELETE", /^\/api\/users\/\d+$/, deleteUser);
};
