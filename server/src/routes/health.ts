import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  const totalSeconds = Math.floor(process.uptime());
  const dd = Math.floor(totalSeconds / 86400);
  const hh = Math.floor((totalSeconds % 86400) / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const uptime = `${String(dd).padStart(2, "0")}:${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  res.json({ status: "ok", uptime });
});

export default router;
