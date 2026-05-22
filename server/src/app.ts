import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { tenantResolver } from "./middleware/tenantResolver";
import authRouter from "./routes/auth";
import superAdminRouter from "./routes/superAdmin";
import adminRouter from "./routes/admin";
import quizRouter from "./routes/quiz";
import healthRouter from "./routes/health";

dotenv.config();

const app = express();

// ---------------------------------------------------------------------------
// CORS — origin validated against CLIENT_ORIGIN_REGEX from env.
// DEV_CUSTOM_DOMAIN is also allowed when running in development so that
// companydomain.local:5173 passes without needing a regex change.
// ---------------------------------------------------------------------------
const originRegex = new RegExp(process.env.CLIENT_ORIGIN_REGEX ?? ".*");
const devCustomDomain = process.env.DEV_CUSTOM_DOMAIN;

app.use(
  cors({
    credentials: true,
    origin(requestOrigin, callback) {
      // Allow server-to-server / curl with no Origin header
      if (!requestOrigin) return callback(null, true);

      const allowed =
        originRegex.test(requestOrigin) ||
        (devCustomDomain !== undefined &&
          requestOrigin.includes(devCustomDomain));

      if (allowed) {
        callback(null, requestOrigin);
      } else {
        callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
      }
    },
  })
);

app.use(express.json());
app.use(tenantResolver);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/health", healthRouter);

// Auth (signup / verify / login — no additional auth middleware needed)
app.use("/api/auth", authRouter);

// SuperAdmin — all routes require a SUPERADMIN JWT
app.use("/api/superadmin", superAdminRouter);

// Admin — all routes require an ADMIN JWT scoped to req.tenantId
app.use("/api/admin", adminRouter);

// Public quiz-taking — tenant-scoped, no auth required
app.use("/api/t", quizRouter);

export default app;
