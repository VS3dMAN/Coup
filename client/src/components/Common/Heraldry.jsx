// Heraldic SVG primitives — pure presentational, no behavior changes
// Extracted from the Medieval Coup design bundle.

export const Flourish = ({ kind = 'divider', width = 240, color }) => {
    const stroke = color || 'var(--c-gold)';
    if (kind === 'divider') {
        return (
            <svg width={width} height="16" viewBox="0 0 240 16" style={{ display: 'block' }} aria-hidden>
                <line x1="0" y1="8" x2="100" y2="8" stroke={stroke} strokeWidth="0.8" />
                <line x1="140" y1="8" x2="240" y2="8" stroke={stroke} strokeWidth="0.8" />
                <circle cx="120" cy="8" r="3.5" fill="none" stroke={stroke} strokeWidth="0.8" />
                <circle cx="120" cy="8" r="1.2" fill={stroke} />
                <circle cx="105" cy="8" r="1" fill={stroke} />
                <circle cx="135" cy="8" r="1" fill={stroke} />
            </svg>
        );
    }
    if (kind === 'corner') {
        return (
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ display: 'block' }} aria-hidden>
                <path d="M2 2 L20 2 M2 2 L2 20 M2 2 Q14 6 18 18 Q16 14 2 2" fill="none" stroke={stroke} strokeWidth="0.9" />
                <circle cx="2" cy="2" r="1.6" fill={stroke} />
            </svg>
        );
    }
    return null;
};

const SHIELD_PALETTE = [
    'var(--c-burgundy)',
    'var(--c-navy)',
    '#2a5a3a',
    '#6a4a1a',
    '#4a2a5a',
    '#2a4a5a',
];

export const shieldColorFor = (seed) => {
    if (!seed) return SHIELD_PALETTE[0];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return SHIELD_PALETTE[h % SHIELD_PALETTE.length];
};

export const initialsFor = (name) => {
    if (!name) return '··';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export const Shield = ({ color, initials = '··', size = 40 }) => {
    const fill = color || 'var(--c-burgundy)';
    const id = `sh-${initials}-${Math.random().toString(36).slice(2, 7)}`;
    return (
        <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={fill} stopOpacity="1" />
                    <stop offset="1" stopColor={fill} stopOpacity="0.75" />
                </linearGradient>
            </defs>
            <path d="M4 4 L36 4 L36 24 Q36 38 20 44 Q4 38 4 24 Z" fill={`url(#${id})`} stroke="var(--c-gold)" strokeWidth="1.2" />
            <path d="M4 4 L36 4 L36 14 L4 14 Z" fill="rgba(255,255,255,0.08)" />
            <text x="20" y="28" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700" fontSize="13" fill="var(--c-goldBright)" letterSpacing="0.5">
                {initials}
            </text>
        </svg>
    );
};

export const Coin = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ flexShrink: 0, verticalAlign: 'middle' }} aria-hidden>
        <circle cx="10" cy="10" r="9" fill="var(--c-gold)" stroke="var(--c-goldDeep)" strokeWidth="0.8" />
        <circle cx="10" cy="10" r="6.5" fill="none" stroke="var(--c-goldDeep)" strokeWidth="0.5" />
        <text x="10" y="13.5" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="8" fontWeight="700" fill="var(--c-goldDeep)">C</text>
    </svg>
);

export const Influence = ({ alive = true, size = 16 }) => {
    if (alive) {
        return (
            <svg width={size} height={size} viewBox="0 0 20 20" style={{ flexShrink: 0, verticalAlign: 'middle' }} aria-hidden>
                <path d="M10 17 C3 12 2 8 5 6 C7.5 4.5 9 6 10 8 C11 6 12.5 4.5 15 6 C18 8 17 12 10 17 Z" fill="var(--c-accent)" stroke="var(--c-burgundyDeep)" strokeWidth="0.6" />
                <path d="M6.5 7 Q7.5 6 8.5 7" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" style={{ flexShrink: 0, opacity: 0.5, verticalAlign: 'middle' }} aria-hidden>
            <path d="M10 17 C3 12 2 8 5 6 C7.5 4.5 9 6 10 8 C11 6 12.5 4.5 15 6 C18 8 17 12 10 17 Z" fill="none" stroke="var(--c-inkSoft)" strokeWidth="0.8" strokeDasharray="2 1.5" />
            <path d="M8 8 L12 14 M12 8 L8 14" stroke="var(--c-inkSoft)" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
};

export const WaxSeal = ({ size = 40, label = '★' }) => {
    const id = `wax-${Math.random().toString(36).slice(2, 7)}`;
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
            <defs>
                <radialGradient id={id} cx="0.35" cy="0.35" r="0.7">
                    <stop offset="0" stopColor="#c13828" />
                    <stop offset="0.6" stopColor="var(--c-accent)" />
                    <stop offset="1" stopColor="var(--c-burgundyDeep)" />
                </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="17" fill={`url(#${id})`} stroke="var(--c-burgundyDeep)" strokeWidth="0.8" />
            <circle cx="20" cy="20" r="13" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.5" />
            <text x="20" y="25" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="14" fontWeight="700" fill="var(--c-goldBright)">{label}</text>
            <path d="M12 10 Q20 6 28 10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
    );
};

export const CrownEmblem = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <path d="M8 26 L8 18 L14 22 L20 12 L26 22 L32 18 L32 26 Z" fill="var(--c-gold)" stroke="var(--c-goldDeep)" strokeWidth="0.6" />
        <circle cx="8" cy="17" r="1.8" fill="var(--c-goldBright)" />
        <circle cx="20" cy="11" r="2" fill="var(--c-accent)" stroke="var(--c-goldDeep)" strokeWidth="0.5" />
        <circle cx="32" cy="17" r="1.8" fill="var(--c-goldBright)" />
        <rect x="6" y="28" width="28" height="2.5" fill="var(--c-gold)" />
    </svg>
);
