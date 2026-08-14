/**
 * ThemeSweepOverlay — DISABLED
 *
 * Like ThemeCircularRippleOverlay, this component previously caused a
 * ~350-500ms delay by applying CSS classes mid-animation.
 *
 * Theme switching is now instant via themeStore.ts → applyThemeToDom().
 * This component returns null and is kept only to avoid breaking imports.
 */
const ThemeSweepOverlay: React.FC = () => null
export default ThemeSweepOverlay

import React from 'react'
