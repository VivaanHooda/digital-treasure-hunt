// Central server-authoritative constants.
// (Skip penalty, cooldown, and max skips are admin-managed in GameSettings.)

// Reject GPS fixes too imprecise to trust against the challenge margin.
export const MAX_ACCURACY_MULTIPLIER = 3; // accuracy must be <= margin * this

// Admin is authenticated from env creds (not the DB) and may log in on multiple
// devices. This sentinel is the synthetic admin's user id.
export const ADMIN_ID = "admin";
