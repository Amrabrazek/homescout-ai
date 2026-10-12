export const BUYER_COOKIE = 'hs_buyer';
export const BUYER_ID_HEADER = 'x-buyer-id';
export const BUYER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Time of the buyer's last page view; a gap longer than VISIT_GAP_MS starts a new visit. */
export const LAST_SEEN_COOKIE = 'hs_seen';
/** When the previous visit ended: the cut-off for "New since your last visit". */
export const PREVIOUS_VISIT_COOKIE = 'hs_prev_visit';
export const VISIT_GAP_MS = 30 * 60 * 1000;
