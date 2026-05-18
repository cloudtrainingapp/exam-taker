import { Router } from "express";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin";
import {
  getDashboardStats,
  listTenants,
  createTenant,
  getTenant,
  updateTenant,
  deleteTenant,
} from "../controllers/superAdminController";

const router = Router();

router.use(requireSuperAdmin);

router.get("/stats", getDashboardStats);
router.get("/tenants", listTenants);
router.post("/tenants", createTenant);
router.get("/tenants/:id", getTenant);
router.patch("/tenants/:id", updateTenant);
router.delete("/tenants/:id", deleteTenant);

export default router;
