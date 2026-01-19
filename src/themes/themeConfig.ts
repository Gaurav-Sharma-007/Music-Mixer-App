export interface Theme {
    name: string;
    label: string;
    colors: {
        premiumBlack: string;
        premiumGray: string;
        neonBlue: string;
        neonPurple: string;
        sliderThumb?: string; // Optional override
    };
    animation: {
        pulseSlow: string;
    };
}

export const THEMES: Theme[] = [
    {
        name: 'default',
        label: 'Default (Neon Dark)',
        colors: {
            premiumBlack: '#0a0a0a',
            premiumGray: '#1a1a1a',
            neonBlue: '#4d9fff',
            neonPurple: '#b537f2',
        },
        animation: {
            pulseSlow: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }
    },
    {
        name: 'trippy',
        label: 'Trippy (Hallucination)',
        colors: {
            premiumBlack: '#120024',
            premiumGray: '#2a0052',
            neonBlue: '#00ffcc', // Cyber Teal
            neonPurple: '#ff00ff', // Magenta
        },
        animation: {
            pulseSlow: 'pulse 0.5s linear infinite', // Rapid pulsing for hallucination effect
        }
    },
    {
        name: 'cyberpunk',
        label: 'Cyberpunk 2077',
        colors: {
            premiumBlack: '#000000',
            premiumGray: '#111111',
            neonBlue: '#fcee0a', // Cyber Yellow
            neonPurple: '#00e5ff', // Cyber Blue
        },
        animation: {
            pulseSlow: 'pulse 2s ease-in-out infinite',
        }
    },
    {
        name: 'retrowave',
        label: 'Retro Wave',
        colors: {
            premiumBlack: '#180c24', // Deep Purple Bg
            premiumGray: '#2d1b4e',
            neonBlue: '#ff7700', // Sunset Orange
            neonPurple: '#d400d4', // Neon Pink
        },
        animation: {
            pulseSlow: 'pulse 6s ease-in-out infinite', // Slow relaxing pulse
        }
    },
    {
        name: 'zengarden',
        label: 'Zen Garden',
        colors: {
            premiumBlack: '#0f140f', // Dark Greenish Black
            premiumGray: '#1c261c',
            neonBlue: '#4caf50', // Nature Green
            neonPurple: '#81c784', // Light Green
        },
        animation: {
            pulseSlow: 'pulse 8s ease-in-out infinite', // Very slow breathing
        }
    }
];

export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--color-premium-black', theme.colors.premiumBlack);
    root.style.setProperty('--color-premium-gray', theme.colors.premiumGray);
    root.style.setProperty('--color-neon-blue', theme.colors.neonBlue);
    root.style.setProperty('--color-neon-purple', theme.colors.neonPurple);
    root.style.setProperty('--animate-pulse-slow', theme.animation.pulseSlow);
};
