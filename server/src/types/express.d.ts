import { Tenant } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
      context?: "SUPERADMIN";
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
      };
    }
  }
}

export {};
