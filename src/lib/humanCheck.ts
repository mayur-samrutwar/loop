/**
 * Constants for the proof-of-personhood gate that runs on every login.
 *
 * The action is a stable identifier that scopes the World ID nullifier so the
 * Developer Portal can attribute proofs to "Loop login". We don't enforce
 * nullifier uniqueness because the user re-verifies on every login.
 */
export const HUMAN_CHECK_ACTION = 'loop-login';
