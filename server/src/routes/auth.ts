import { Router } from "express";
import { adminSignup, adminVerify, adminLogin } from "../controllers/adminAuthController";
import { superAdminLogin } from "../controllers/superAdminAuthController";

const router = Router();

router.post("/superadmin/login", superAdminLogin);

router.post("/admin/signup", adminSignup);
router.post("/admin/verify", adminVerify);
router.post("/admin/login", adminLogin);

export default router;
