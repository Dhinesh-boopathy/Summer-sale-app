import prisma from "../db.server";

// Unauthenticated liveness/readiness endpoint for the hosting platform.
export const loader = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error.message || error);
    return Response.json({ status: "unhealthy" }, { status: 503 });
  }
};
