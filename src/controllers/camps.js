const {
  getAllCampsService,
  getCampByIdService,
  createCampService,
  updateCampService,
  deleteCampService,
  toggleCampStatusService,
} = require("../services/db");

const parseJson = require("../utils/parseJSON");
const { URL } = require("url");
const handleUpload = require("../utils/upload");
const path = require("path");
const fs = require("fs");

/*
 * GET /api/camps?filter1?filter2...
 * status 200, 500
 */
async function getAllCamps(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const filters = Object.fromEntries(searchParams);
    const camps = await getAllCampsService(filters);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(camps));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * POST /api/camps
 * JSON Body { name, description, latitude, longitude, capacity,region, price, type, wifi, shower, parking, barbecue, status, image_url }
 * Status 201, 400
 */
async function createCamp(req, res) {
  let uploadedFiles = []; // clean-up list
  try {
    let payload,
      mediaUrls = [];

    if ((req.headers["content-type"] || "").startsWith("multipart/form-data")) {
      // multipart/form-data
      let fields, files;
      try {
        ({ fields, files } = await handleUpload(
          req,
          path.join(process.cwd(), "public", "uploads")
        ));
      } catch (e) {
        if (e.message === "FILE_TOO_LARGE")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Fișierul depășește 10 MB" }));
        if (e.message === "TOO_MANY_FILES")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Maxim 5 fișiere permise" }));
        throw e;
      }

      uploadedFiles = files;
      if (!fields.payload) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Lipsește câmpul payload" }));
      }

      payload = JSON.parse(fields.payload);
      mediaUrls = files.map((f) => f.url); // public links
    } else {
      payload = await parseJson(req);
      mediaUrls = payload.mediaUrls || [];
    }

    if (!payload.name) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "name & location obligatorii" }));
    }

    const camp = await createCampService({
      ...payload,
      image_url: mediaUrls.length ? mediaUrls[0] : payload.image_url || "",
    });

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(camp));
  } catch (err) {
    uploadedFiles.forEach((f) => fs.unlink(f.path, () => {}));
    console.error(err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
  }
}

/*
 * PUT /api/camps/:id
 * JSON Body { name, description, latitude, longitude, capacity, region, price, type, wifi, shower, parking, barbecue, status, image_url }
 * Status 200, 400, 404, 500
 */
async function updateCamp(req, res) {
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  let uploadedFiles = [];
  try {
    let payload,
      newMedia = [];

    if ((req.headers["content-type"] || "").startsWith("multipart/form-data")) {
      let fields, files;
      try {
        ({ fields, files } = await handleUpload(
          req,
          path.join(process.cwd(), "public", "uploads")
        ));
      } catch (e) {
        if (e.message === "FILE_TOO_LARGE")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Fișierul depășește 10 MB" }));
        if (e.message === "TOO_MANY_FILES")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Maxim 5 fișiere permise" }));
        throw e;
      }

      uploadedFiles = files;
      if (!fields.payload) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Lipsește câmpul payload" }));
      }

      payload = JSON.parse(fields.payload);
      newMedia = files.map((f) => f.url);
    } else {
      payload = await parseJson(req);
      newMedia = payload.newMedia || [];
    }

    // merge media lists if client only sends diff
    const finalPayload = {
      ...payload,
      image_url: newMedia.length ? newMedia[0] : payload.image_url || null,
    };

    const camp = await updateCampService(id, finalPayload);

    if (!camp) {
      uploadedFiles.forEach((f) => fs.unlink(f.path, () => {}));
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(camp));
  } catch (err) {
    uploadedFiles.forEach((f) => fs.unlink(f.path, () => {}));
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
/*
 * DELETE /api/camps/:id
 * Status 204, 400, 404, 500
 */

async function deleteCamp(req, res) {
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  try {
    const deleted = await deleteCampService(id);

    if (!deleted) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(204);
    return res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * PUT /api/camps/:id/status
 * JSON Body { active: boolean }
 * status 200, 400, 404, 500
 */
async function toggleCampStatus(req, res) {
  // 1) extrage ID-ul din URL
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  // 2) parsează body-ul JSON
  let body;
  try {
    body = await parseJson(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  const { active } = body;
  if (typeof active !== "boolean") {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Field 'active' must be boolean" }));
  }

  // 3) update status
  try {
    const camp = await toggleCampStatusService(id, active);

    if (!camp) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(camp));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * GET /api/camps/:id
 * Status 200, 400, 404, 500
 */
async function getCampById(req, res) {
  // extrage id-ul din URL
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];

  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  try {
    const camp = await getCampByIdService(id);

    if (!camp) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(camp));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

module.exports = function registerCampsRoutes(router) {
  router.add("GET", /^\/api\/camps(?:\?.*)?$/, getAllCamps);
  router.add("POST", /^\/api\/camps$/, createCamp);
  router.add("PUT", /^\/api\/camps\/\d+$/, updateCamp);
  router.add("DELETE", /^\/api\/camps\/\d+$/, deleteCamp);
  router.add("PATCH", /^\/api\/camps\/\d+$/, toggleCampStatus);
  router.add("GET", /^\/api\/camps\/\d+$/, getCampById);
};
