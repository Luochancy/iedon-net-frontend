/*
*******************************************************************
plugins/vuetify.ts

Copyright (C) 2026 Luochancy

Licensed under the GNU General Public License v3.0.
See LICENSE in the project root.
*******************************************************************
*/
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// MD3 Dynamic Color System
// Seed colors for tonal palette generation
const SEED_PRIMARY = '#1a94bc'
const SEED_SECONDARY = '#94cced'
const SEED_TERTIARY = '#eb9395'

// Helper: hex to HSL
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

// Helper: HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Generate MD3 tonal palette from seed
function generateTonalPalette(seed: string) {
  const [h, s] = hexToHsl(seed)
  return {
    10: hslToHex(h, Math.max(s - 10, 10), 10),
    20: hslToHex(h, Math.max(s - 5, 15), 20),
    30: hslToHex(h, s, 30),
    40: hslToHex(h, s, 40),
    50: hslToHex(h, s, 50),
    60: hslToHex(h, s, 60),
    70: hslToHex(h, Math.max(s - 5, 15), 70),
    80: hslToHex(h, Math.max(s - 10, 10), 80),
    90: hslToHex(h, Math.max(s - 15, 8), 90),
    95: hslToHex(h, Math.max(s - 20, 5), 95),
    99: hslToHex(h, Math.max(s - 25, 3), 99),
  }
}

const primaryPalette = generateTonalPalette(SEED_PRIMARY)
const secondaryPalette = generateTonalPalette(SEED_SECONDARY)
const tertiaryPalette = generateTonalPalette(SEED_TERTIARY)

const luocynetDark = {
  dark: true,
  colors: {
    background: '#111318',
    surface: '#191c22',
    'surface-bright': '#383b42',
    'surface-variant': '#43474e',
    'surface-container': '#1d2026',
    'surface-container-low': '#171a1f',
    'surface-container-high': '#282b31',
    'surface-container-highest': '#33353c',
    'on-surface': '#e2e3e8',
    'on-surface-variant': '#c3c6cf',
    primary: primaryPalette[80],
    'primary-darken-1': primaryPalette[70],
    'primary-container': primaryPalette[30],
    'on-primary': primaryPalette[20],
    'on-primary-container': primaryPalette[90],
    secondary: secondaryPalette[80],
    'secondary-darken-1': secondaryPalette[70],
    'secondary-container': secondaryPalette[30],
    'on-secondary': secondaryPalette[20],
    'on-secondary-container': secondaryPalette[90],
    tertiary: tertiaryPalette[80],
    'tertiary-darken-1': tertiaryPalette[70],
    'tertiary-container': tertiaryPalette[30],
    'on-tertiary': tertiaryPalette[20],
    'on-tertiary-container': tertiaryPalette[90],
    error: '#ffb4ab',
    'error-darken-1': '#ff897d',
    'error-container': '#93000a',
    'on-error': '#690005',
    'on-error-container': '#ffdad6',
    info: primaryPalette[80],
    success: '#80d89b',
    warning: '#ffc77a',
    outline: '#8d9099',
    'outline-variant': '#43474e',
    'inverse-surface': '#e2e3e8',
    'inverse-on-surface': '#2e3138',
    'inverse-primary': primaryPalette[40],
    'scrim': '#000000',
    'shadow': '#000000',
  },
}

const luocynetLight = {
  dark: false,
  colors: {
    background: '#f8f9ff',
    surface: '#faf8ff',
    'surface-bright': '#ffffff',
    'surface-variant': '#dfe2f0',
    'surface-container': '#eeedf4',
    'surface-container-low': '#f3f1f8',
    'surface-container-high': '#e8e6ed',
    'surface-container-highest': '#e2e0e8',
    'on-surface': '#1a1c22',
    'on-surface-variant': '#44474f',
    primary: primaryPalette[40],
    'primary-darken-1': primaryPalette[30],
    'primary-container': primaryPalette[90],
    'on-primary': '#ffffff',
    'on-primary-container': primaryPalette[10],
    secondary: secondaryPalette[40],
    'secondary-darken-1': secondaryPalette[30],
    'secondary-container': secondaryPalette[90],
    'on-secondary': '#ffffff',
    'on-secondary-container': secondaryPalette[10],
    tertiary: tertiaryPalette[40],
    'tertiary-darken-1': tertiaryPalette[30],
    'tertiary-container': tertiaryPalette[90],
    'on-tertiary': '#ffffff',
    'on-tertiary-container': tertiaryPalette[10],
    error: '#ba1a1a',
    'error-darken-1': '#8c0014',
    'error-container': '#ffdad6',
    'on-error': '#ffffff',
    'on-error-container': '#410002',
    info: primaryPalette[40],
    success: '#1a6c32',
    warning: '#7d5700',
    outline: '#75777f',
    'outline-variant': '#c5c6d0',
    'inverse-surface': '#2f3038',
    'inverse-on-surface': '#f0f0f8',
    'inverse-primary': primaryPalette[80],
    'scrim': '#000000',
    'shadow': '#000000',
  },
}

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'luocynetLight',
    themes: {
      luocynetLight,
      luocynetDark,
    },
  },
  defaults: {
    VBtn: { rounded: 'xl', variant: 'flat' },
    VCard: { rounded: 'xl', elevation: 0 },
    VTextField: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VTextarea: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VSelect: { variant: 'outlined', density: 'comfortable', rounded: 'lg' },
    VCheckbox: { density: 'comfortable', color: 'primary' },
    VSwitch: { density: 'comfortable', color: 'primary' },
    VChip: { rounded: 'lg' },
    VAlert: { rounded: 'lg', variant: 'tonal' },
    VSheet: { rounded: 'xl' },
    VList: { rounded: 'xl' },
    VNavigationDrawer: { rounded: 0 },
    VDivider: { thickness: 1 },
    VFab: { size: 'large', rounded: 'xl' },
    VBanner: { rounded: 'xl' },
  },
})
