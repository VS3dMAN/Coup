/**
 * Role artwork lookup.
 *
 * The paintings live in client/public/assets/, so Vite serves them from the
 * site root untouched — no bundler import needed, just an absolute URL.
 *
 *   /assets/roles/{slug}.jpg        768x1024 (3:4) card face art
 *   /assets/roles/icons/{slug}.jpg  256x256  (1:1) head crop for small badges
 *
 * Card types arrive from the server as "Duke", "Assassin", … (see
 * utils/constants.js CARD_TYPES), but we match case-insensitively so a
 * differently-cased value never silently renders a broken image.
 */

const ROLE_SLUGS = ['duke', 'assassin', 'captain', 'ambassador', 'contessa'];

const slugFor = (cardType) => {
    if (!cardType || typeof cardType !== 'string') return null;
    const slug = cardType.trim().toLowerCase();
    return ROLE_SLUGS.includes(slug) ? slug : null;
};

/** Full 3:4 card-face painting, or null for an unknown/unrevealed role. */
export const roleArt = (cardType) => {
    const slug = slugFor(cardType);
    return slug ? `/assets/roles/${slug}.jpg` : null;
};

/** Square head crop for mini cards, chips and buttons. */
export const roleIcon = (cardType) => {
    const slug = slugFor(cardType);
    return slug ? `/assets/roles/icons/${slug}.jpg` : null;
};

export const hasRoleArt = (cardType) => slugFor(cardType) !== null;
