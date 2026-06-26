import { env } from "./_generated/server";

export const isAdmin = (adminSecret: string) => {
  const expectedSecret = env.POSTCARD_ADMIN_SECRET;
  return Boolean(expectedSecret && adminSecret === expectedSecret);
};

export const requireAdmin = (adminSecret: string) => {
  if (!env.POSTCARD_ADMIN_SECRET) {
    throw new Error("Admin secret is not configured.");
  }
  if (!isAdmin(adminSecret)) {
    throw new Error("Wrong admin password.");
  }
};
