/// <reference types="vite/client" />
// Module map for convex-test. Lives at the convex/ root so paths resolve like the deployment.
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
