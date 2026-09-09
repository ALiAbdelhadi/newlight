/**
 * The comparison's two constants, in a module with NO directive.
 *
 * They are needed on both sides: the browser store enforces the cap when a tile is ticked, and
 * the server action enforces it again on the way in, because a server action's argument is a
 * request body and not a promise.
 *
 * They live here rather than in `compare-store.ts` because that file is `"use client"`, and
 * importing a value from a client module into a `"use server"` one puts a client-reference
 * proxy in the server graph instead of the number — which does not fail loudly, it fails by
 * quietly breaking the module for both sides. A shared constant belongs in a file that claims
 * neither environment.
 */

export const COMPARE_KEY = "newlight:compare"

/**
 * Four columns.
 *
 * A layout limit, not a technical one: five columns of specifications are unreadable on a
 * laptop, and a comparison nobody can read is worse than no comparison.
 */
export const COMPARE_MAX = 4
