// Usage (from the backend folder):
//   node scripts/db-check.js
//   node scripts/db-check.js 6ac0fe07cdef8384f01d3fd0     (also looks up that user _id)
require("dotenv").config();
const dns = require("dns").promises;
const mongoose = require("mongoose");

const uri = (process.env.MONGO_URI || "").trim();
const lookupId = process.argv[2];

const redact = (u) => u.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");
const ok = (m) => console.log(`  [PASS] ${m}`);
const warn = (m) => console.log(`  [WARN] ${m}`);
const fail = (m) => console.log(`  [FAIL] ${m}`);
const step = (m) => console.log(`\n${m}`);

(async () => {
  let failed = false;

  step("1. Environment");
  if (!uri) {
    fail("MONGO_URI is empty. Make sure backend/.env exists and you run this from the backend folder.");
    process.exit(1);
  }
  ok(`MONGO_URI found: ${redact(uri)}`);

  let dbInUri = "";
  try {
    dbInUri = new URL(uri).pathname.replace("/", "");
  } catch {
    fail("MONGO_URI is not a valid URL. Special characters in the password must be URL-encoded.");
    process.exit(1);
  }
  if (!dbInUri) warn("No database name in the URI (after the host). Mongoose will use the default 'test' database.");
  else ok(`Database name in URI: ${dbInUri}`);

  const isAtlas = uri.startsWith("mongodb+srv://");
  console.log(`  Target type: ${isAtlas ? "MongoDB Atlas" : /localhost|127\.0\.0\.1/.test(uri) ? "local MongoDB" : "other host"}`);
  if (process.env.NODE_ENV === "production") warn("NODE_ENV=production in this shell.");

  if (isAtlas) {
    step("2. DNS lookup (Atlas SRV record)");
    try {
      const host = new URL(uri).hostname;
      const records = await dns.resolveSrv(`_mongodb._tcp.${host}`);
      ok(`Resolved ${records.length} server(s), e.g. ${records[0].name}`);
    } catch (e) {
      fail(`DNS failed: ${e.code || e.message}. Check the cluster address and your internet or DNS.`);
      failed = true;
    }
  }

  step("3. Connect");
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    ok(`Connected. Host: ${mongoose.connection.host}`);
    ok(`Active database: ${mongoose.connection.name}`);
  } catch (e) {
    fail(`Could not connect: ${e.message}`);
    const m = e.message.toLowerCase();
    if (m.includes("auth")) console.log("     Fix: wrong username or password. Atlas > Database Access.");
    else if (m.includes("server selection") || m.includes("timed out") || m.includes("econnrefused"))
      console.log("     Fix: Atlas > Network Access > add your current IP (or 0.0.0.0/0 for testing). For local, start mongod.");
    else if (m.includes("enotfound") || m.includes("querysrv")) console.log("     Fix: host name not resolved. Check the cluster address.");
    process.exit(1);
  }

  const db = mongoose.connection.db;

  step("4. Ping");
  try {
    await db.admin().ping();
    ok("Server responded to ping");
  } catch (e) {
    fail(`Ping failed: ${e.message}`);
    failed = true;
  }

  step("5. Write / read / delete test (collection: _healthcheck)");
  try {
    const col = db.collection("_healthcheck");
    const { insertedId } = await col.insertOne({ createdAt: new Date(), note: "db-check" });
    ok(`Inserted test document ${insertedId}`);
    const found = await col.findOne({ _id: insertedId });
    found ? ok("Read it back") : (fail("Could not read it back"), (failed = true));
    await col.deleteOne({ _id: insertedId });
    ok("Deleted it (no leftovers)");
  } catch (e) {
    fail(`Write test failed: ${e.message}`);
    console.log("     Fix: this database user may be read-only. Atlas > Database Access > give it readWrite.");
    failed = true;
  }

  step("6. Databases on this server");
  try {
    const { databases } = await db.admin().listDatabases();
    databases.forEach((d) => console.log(`  - ${d.name}${d.name === mongoose.connection.name ? "   <-- active" : ""}`));
  } catch {
    warn("This user cannot list databases (limited permissions). That is normal for restricted users.");
  }

  step(`7. Collections in "${mongoose.connection.name}"`);
  try {
    const cols = await db.listCollections().toArray();
    if (!cols.length) warn("No collections yet. Nothing has been written to this database.");
    for (const c of cols) {
      if (c.name === "_healthcheck") continue;
      const n = await db.collection(c.name).countDocuments();
      console.log(`  - ${c.name}: ${n} document(s)`);
    }
  } catch (e) {
    fail(`Could not list collections: ${e.message}`);
    failed = true;
  }

  step("8. Users");
  try {
    const users = db.collection("users");
    const total = await users.countDocuments();
    console.log(`  users collection has ${total} document(s)`);
    const latest = await users.find({}, { projection: { password: 0 } }).sort({ _id: -1 }).limit(3).toArray();
    latest.forEach((u) => console.log(`  - ${u._id}  ${u.email}  (${u.name})`));

    if (lookupId) {
      if (!mongoose.isValidObjectId(lookupId)) fail(`"${lookupId}" is not a valid ObjectId`);
      else {
        const u = await users.findOne({ _id: new mongoose.Types.ObjectId(lookupId) }, { projection: { password: 0 } });
        u ? ok(`Found user ${lookupId}: ${u.email}`)
          : fail(`User ${lookupId} is NOT in this database. The API wrote somewhere else (see step 9).`);
      }
    }
  } catch (e) {
    fail(`User check failed: ${e.message}`);
  }

  step("9. Reminder: Docker Compose overrides MONGO_URI");
  console.log("  docker-compose.yml sets MONGO_URI=mongodb://mongo:27017/cicd_platform for the backend container.");
  console.log("  If you run the API with `docker compose up`, data goes to the local 'mongo' container, NOT Atlas.");
  console.log("  If you run `npm start` in backend/, it uses the .env value above.");

  console.log(failed ? "\nRESULT: problems found. Fix the [FAIL] items above.\n" : "\nRESULT: database connection and read/write are working.\n");
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})();