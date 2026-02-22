/**
 * Curated Color Book — a hand-picked palette of ~30 base colors,
 * each with 6 carefully chosen shades (lightest → darkest).
 *
 * Agents pick from THIS catalog instead of inventing hex values.
 * Inspired by Tailwind's palette but trimmed to the best, most
 * "prestigious" shades only.
 */

const COLOR_BOOK = {
  // ── REDS ──
  red: {
    name: 'Red',
    shades: {
      lightest: '#fef2f2',
      light:    '#fca5a5',
      base:     '#ef4444',
      vivid:    '#dc2626',
      dark:     '#b91c1c',
      darkest:  '#7f1d1d',
    },
    mood: 'urgency, passion, energy, danger, love',
  },
  rose: {
    name: 'Rose',
    shades: {
      lightest: '#fff1f2',
      light:    '#fda4af',
      base:     '#f43f5e',
      vivid:    '#e11d48',
      dark:     '#be123c',
      darkest:  '#881337',
    },
    mood: 'romance, elegance, warmth, femininity',
  },
  crimson: {
    name: 'Crimson',
    shades: {
      lightest: '#fdf2f8',
      light:    '#f9a8d4',
      base:     '#ec4899',
      vivid:    '#db2777',
      dark:     '#be185d',
      darkest:  '#831843',
    },
    mood: 'bold, striking, luxury fashion, nightlife',
  },

  // ── ORANGES ──
  orange: {
    name: 'Orange',
    shades: {
      lightest: '#fff7ed',
      light:    '#fdba74',
      base:     '#f97316',
      vivid:    '#ea580c',
      dark:     '#c2410c',
      darkest:  '#7c2d12',
    },
    mood: 'creativity, enthusiasm, warmth, food, fun',
  },
  amber: {
    name: 'Amber',
    shades: {
      lightest: '#fffbeb',
      light:    '#fcd34d',
      base:     '#f59e0b',
      vivid:    '#d97706',
      dark:     '#b45309',
      darkest:  '#78350f',
    },
    mood: 'warmth, caution, harvest, premium, gold',
  },

  // ── YELLOWS ──
  yellow: {
    name: 'Yellow',
    shades: {
      lightest: '#fefce8',
      light:    '#fde047',
      base:     '#eab308',
      vivid:    '#ca8a04',
      dark:     '#a16207',
      darkest:  '#713f12',
    },
    mood: 'optimism, attention, sunshine, happiness',
  },

  // ── GREENS ──
  lime: {
    name: 'Lime',
    shades: {
      lightest: '#f7fee7',
      light:    '#bef264',
      base:     '#84cc16',
      vivid:    '#65a30d',
      dark:     '#4d7c0f',
      darkest:  '#365314',
    },
    mood: 'fresh, eco, natural, growth, organic',
  },
  green: {
    name: 'Green',
    shades: {
      lightest: '#f0fdf4',
      light:    '#86efac',
      base:     '#22c55e',
      vivid:    '#16a34a',
      dark:     '#15803d',
      darkest:  '#14532d',
    },
    mood: 'success, nature, health, money, go',
  },
  emerald: {
    name: 'Emerald',
    shades: {
      lightest: '#ecfdf5',
      light:    '#6ee7b7',
      base:     '#10b981',
      vivid:    '#059669',
      dark:     '#047857',
      darkest:  '#064e3b',
    },
    mood: 'luxury, prestige, jewel, wealth, spa',
  },
  teal: {
    name: 'Teal',
    shades: {
      lightest: '#f0fdfa',
      light:    '#5eead4',
      base:     '#14b8a6',
      vivid:    '#0d9488',
      dark:     '#0f766e',
      darkest:  '#134e4a',
    },
    mood: 'calm, balance, sophistication, medical',
  },

  // ── CYANS ──
  cyan: {
    name: 'Cyan',
    shades: {
      lightest: '#ecfeff',
      light:    '#67e8f9',
      base:     '#06b6d4',
      vivid:    '#0891b2',
      dark:     '#0e7490',
      darkest:  '#164e63',
    },
    mood: 'tech, innovation, digital, fresh, water',
  },

  // ── BLUES ──
  sky: {
    name: 'Sky',
    shades: {
      lightest: '#f0f9ff',
      light:    '#7dd3fc',
      base:     '#0ea5e9',
      vivid:    '#0284c7',
      dark:     '#0369a1',
      darkest:  '#0c4a6e',
    },
    mood: 'open, airy, friendly, social media, travel',
  },
  blue: {
    name: 'Blue',
    shades: {
      lightest: '#eff6ff',
      light:    '#93c5fd',
      base:     '#3b82f6',
      vivid:    '#2563eb',
      dark:     '#1d4ed8',
      darkest:  '#1e3a5f',
    },
    mood: 'trust, professional, corporate, technology, reliable',
  },
  cobalt: {
    name: 'Cobalt',
    shades: {
      lightest: '#eef2ff',
      light:    '#a5b4fc',
      base:     '#6366f1',
      vivid:    '#4f46e5',
      dark:     '#4338ca',
      darkest:  '#312e81',
    },
    mood: 'creative, modern SaaS, innovative, electric',
  },
  indigo: {
    name: 'Indigo',
    shades: {
      lightest: '#eef2ff',
      light:    '#a5b4fc',
      base:     '#6366f1',
      vivid:    '#4f46e5',
      dark:     '#3730a3',
      darkest:  '#1e1b4b',
    },
    mood: 'depth, wisdom, luxury tech, fintech',
  },

  // ── PURPLES ──
  violet: {
    name: 'Violet',
    shades: {
      lightest: '#f5f3ff',
      light:    '#c4b5fd',
      base:     '#8b5cf6',
      vivid:    '#7c3aed',
      dark:     '#6d28d9',
      darkest:  '#4c1d95',
    },
    mood: 'creative, mystical, premium, artistic, AI/ML',
  },
  purple: {
    name: 'Purple',
    shades: {
      lightest: '#faf5ff',
      light:    '#d8b4fe',
      base:     '#a855f7',
      vivid:    '#9333ea',
      dark:     '#7e22ce',
      darkest:  '#581c87',
    },
    mood: 'royalty, luxury, creative, magic, premium brand',
  },
  fuchsia: {
    name: 'Fuchsia',
    shades: {
      lightest: '#fdf4ff',
      light:    '#f0abfc',
      base:     '#d946ef',
      vivid:    '#c026d3',
      dark:     '#a21caf',
      darkest:  '#701a75',
    },
    mood: 'bold, playful, fashion, nightlife, creative agency',
  },

  // ── NEUTRALS ──
  slate: {
    name: 'Slate',
    shades: {
      lightest: '#f8fafc',
      light:    '#cbd5e1',
      base:     '#64748b',
      vivid:    '#475569',
      dark:     '#334155',
      darkest:  '#0f172a',
    },
    mood: 'professional, clean, modern, cool-toned neutral',
  },
  gray: {
    name: 'Gray',
    shades: {
      lightest: '#f9fafb',
      light:    '#d1d5db',
      base:     '#6b7280',
      vivid:    '#4b5563',
      dark:     '#374151',
      darkest:  '#111827',
    },
    mood: 'neutral, balanced, corporate, universal',
  },
  zinc: {
    name: 'Zinc',
    shades: {
      lightest: '#fafafa',
      light:    '#d4d4d8',
      base:     '#71717a',
      vivid:    '#52525b',
      dark:     '#3f3f46',
      darkest:  '#18181b',
    },
    mood: 'modern dark mode, sleek, minimal, tech',
  },
  stone: {
    name: 'Stone',
    shades: {
      lightest: '#fafaf9',
      light:    '#d6d3d1',
      base:     '#78716c',
      vivid:    '#57534e',
      dark:     '#44403c',
      darkest:  '#1c1917',
    },
    mood: 'warm neutral, organic, earthy, natural, cozy',
  },

  // ── SPECIAL / TRENDING ──
  coral: {
    name: 'Coral',
    shades: {
      lightest: '#fff5f5',
      light:    '#fca5a1',
      base:     '#f56565',
      vivid:    '#e53e3e',
      dark:     '#c53030',
      darkest:  '#742a2a',
    },
    mood: 'warm, approachable, lifestyle, food, travel',
  },
  peach: {
    name: 'Peach',
    shades: {
      lightest: '#fef3e2',
      light:    '#fdd8a5',
      base:     '#fbab4e',
      vivid:    '#f49623',
      dark:     '#d07817',
      darkest:  '#8a4f0e',
    },
    mood: 'soft, warm, friendly, beauty, wellness',
  },
  mint: {
    name: 'Mint',
    shades: {
      lightest: '#f0fff4',
      light:    '#9ae6b4',
      base:     '#48bb78',
      vivid:    '#38a169',
      dark:     '#2f855a',
      darkest:  '#22543d',
    },
    mood: 'fresh, clean, health, organic, spa, dental',
  },
  navy: {
    name: 'Navy',
    shades: {
      lightest: '#e8edf5',
      light:    '#8e9fc2',
      base:     '#2d3a6e',
      vivid:    '#1e2a5e',
      dark:     '#162050',
      darkest:  '#0a1128',
    },
    mood: 'authority, trust, finance, law, serious business',
  },
  charcoal: {
    name: 'Charcoal',
    shades: {
      lightest: '#f0f0f0',
      light:    '#a3a3a3',
      base:     '#525252',
      vivid:    '#404040',
      dark:     '#262626',
      darkest:  '#0a0a0a',
    },
    mood: 'elegant, minimal, editorial, high-end dark theme',
  },
  gold: {
    name: 'Gold',
    shades: {
      lightest: '#fefce8',
      light:    '#fde68a',
      base:     '#d4a017',
      vivid:    '#b8860b',
      dark:     '#92700c',
      darkest:  '#5c4813',
    },
    mood: 'premium, luxury, awards, financial, prestige',
  },
}

/**
 * Get the full color book formatted for agent context.
 */
export function getColorBook() {
  return COLOR_BOOK
}

/**
 * Find colors by mood/keyword match.
 */
export function getColorsByMood(keyword) {
  const kw = keyword.toLowerCase()
  return Object.entries(COLOR_BOOK)
    .filter(([, color]) => color.mood.toLowerCase().includes(kw))
    .map(([key, color]) => ({ key, ...color }))
}

/**
 * Get a specific color with all its shades.
 */
export function getColor(colorKey) {
  return COLOR_BOOK[colorKey] || null
}

/**
 * Format the color book as a compact string for agent context injection.
 * Agents see each color name, its mood, and all 6 shade hex values.
 */
export function formatColorBookForAgent() {
  const lines = []
  lines.push('CURATED COLOR PALETTE — pick colors ONLY from this catalog:')
  lines.push('Each color has 6 shades: lightest, light, base, vivid, dark, darkest')
  lines.push('Choose 1-3 colors for the project. Use the "mood" to match the brief.\n')

  for (const [key, color] of Object.entries(COLOR_BOOK)) {
    const shades = Object.entries(color.shades).map(([s, hex]) => `${s}:${hex}`).join(' | ')
    lines.push(`${color.name.toUpperCase()} (${key}) — ${color.mood}`)
    lines.push(`  ${shades}`)
  }

  lines.push('\nRULES:')
  lines.push('- ALWAYS use hex values from this catalog — never invent your own')
  lines.push('- Pick "base" for primary buttons/accents, "light" for hover backgrounds, "dark" for active states')
  lines.push('- "lightest" works for tinted section backgrounds, "darkest" for dark mode backgrounds')
  lines.push('- "vivid" is for CTAs and elements that need to POP')
  lines.push('- For neutrals, pair a color (blue, purple, etc.) with slate, zinc, or charcoal')

  return lines.join('\n')
}
