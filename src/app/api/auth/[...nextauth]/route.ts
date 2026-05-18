// src/app/api/auth/[...nextauth]/route.ts — NextAuth handlers
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
