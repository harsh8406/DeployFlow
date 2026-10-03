const mongoose = require("mongoose");

const LOCAL_FALLBACK_URI = "mongodb://localhost:27017/cicd_platform";
const MAX_RETRY_DELAY_MS = 30000;

let retryTimer = null;
let attempt = 0;
let listenersAttached = false;

// Hides the password so the URI can be logged safely.
const redactUri = (uri) => uri.replace(/\/\/([^:/@]+):([^@]+)@/, "//$1:***@");

const describeTarget = (uri) => {
  if (uri.startsWith("mongodb+srv://") || uri.includes(".mongodb.net")) return "MongoDB Atlas";
  if (/@?(localhost|127\.0\.0\.1)(:|\/)/.test(uri)) return "local MongoDB (localhost)";
  if (uri.includes("//mongo:")) return "Docker Compose MongoDB container (mongo)";
  return "custom MongoDB host";
};

const hintFor = (error) => {
  const msg = `${error.name} ${error.message}`.toLowerCase();
  if (msg.includes("authentication failed") || msg.includes("bad auth")) {
    return "Check the database username and password in MONGO_URI (Atlas > Database Access).";
  }
  if (msg.includes("enotfound") || msg.includes("querysrv")) {
    return "The host name could not be resolved. Check the cluster address and your internet/DNS.";
  }
  if (msg.includes("serverselection") || msg.includes("timed out") || msg.includes("econnrefused")) {
    return "Cannot reach the server. For Atlas, add your IP under Network Access. For local, make sure mongod is running.";
  }
  return null;
};

const attachListenersOnce = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("connected", () => console.log("[MongoDB] Connection established"));
  mongoose.connection.on("reconnected", () => console.log("[MongoDB] Reconnected"));
  mongoose.connection.on("disconnected", () =>
    console.warn("[MongoDB] Disconnected. The driver will try to reconnect automatically.")
  );
  mongoose.connection.on("error", (err) => console.error(`[MongoDB] Connection error: ${err.message}`));
};

const resolveUri = () => {
  const uri = (process.env.MONGO_URI || "").trim();
  if (uri) return uri;

  if (process.env.NODE_ENV === "production") {
    console.error("[MongoDB] FATAL: MONGO_URI is not set. Refusing to start in production without it.");
    process.exit(1);
  }

  console.warn(
    `[MongoDB] WARNING: MONGO_URI is not set. Falling back to ${LOCAL_FALLBACK_URI}. ` +
      "Data will NOT go to Atlas."
  );
  return LOCAL_FALLBACK_URI;
};

const connectDB = async () => {
  attachListenersOnce();
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  const mongoUri = resolveUri();
  attempt += 1;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    attempt = 0;
    console.log(`[MongoDB] Target:          ${describeTarget(mongoUri)}`);
    console.log(`[MongoDB] URI:             ${redactUri(mongoUri)}`);
    console.log(`[MongoDB] Connected Host:  ${conn.connection.host}`);
    console.log(`[MongoDB] Active Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection attempt ${attempt} failed: ${error.message}`);
    const hint = hintFor(error);
    if (hint) console.error(`[MongoDB] Hint: ${hint}`);

    // Exponential backoff (2s, 4s, 8s ... capped at 30s) instead of crashing or hammering the server
    const delay = Math.min(2000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
    console.error(`[MongoDB] Retrying in ${delay / 1000}s...`);
    retryTimer = setTimeout(connectDB, delay);
    return null;
  }
};

module.exports = connectDB;