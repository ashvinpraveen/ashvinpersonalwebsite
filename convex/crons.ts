import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Quadratic: keep upcoming cycles scheduled and roll unfinished issues forward.
crons.interval("quadratic cycles", { hours: 1 }, internal.quadratic.cycles.tick, {});

export default crons;
