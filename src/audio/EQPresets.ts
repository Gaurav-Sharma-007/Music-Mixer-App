
export type EQPresetName = 'Flat' | 'Bass Boost' | 'Treble Boost' | 'Vocal' | 'Club' | 'Rock' | 'Techno' | 'Pop';

export const EQ_PRESETS: Record<EQPresetName, number[]> = {
    // 8 Bands: 60, 150, 400, 1K, 2.4K, 6K, 12K, 15K
    // Values are 0-2 range (where 1 is Flat/0dB, 0 is -26dB, 2 is +6dB)

    'Flat': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],

    'Bass Boost': [1.8, 1.6, 1.2, 1.0, 0.9, 0.9, 1.0, 1.0],

    'Treble Boost': [1.0, 1.0, 1.0, 1.1, 1.3, 1.5, 1.6, 1.6],

    'Vocal': [0.8, 0.9, 1.2, 1.5, 1.5, 1.2, 1.0, 0.9],

    'Club': [1.6, 1.4, 1.0, 1.0, 1.1, 1.3, 1.2, 1.2],

    'Rock': [1.5, 1.3, 0.9, 1.1, 1.3, 1.4, 1.1, 1.1],

    'Techno': [1.7, 1.3, 0.8, 0.9, 1.0, 1.1, 1.4, 1.6],

    'Pop': [1.2, 1.1, 1.2, 1.1, 1.1, 1.2, 1.1, 1.1],
};
