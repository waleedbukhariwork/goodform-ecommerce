import type { Request } from "express";
export type OwnerRequest = Request & { ownerId?: string; requestId?: string };
