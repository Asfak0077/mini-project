/**
 * ThemeCircularRippleOverlay — DISABLED
 *
 * The circular ripple overlay previously caused a ~350-700ms delay between
 * the user clicking the theme toggle and the DOM updating, because it applied
 * CSS classes mid-animation at 45% completion.
 *
 * Theme switching is now instant via themeStore.ts → applyThemeToDom().
 * This component returns null and is kept only to avoid breaking imports.
 */
const ThemeCircularRippleOverlay: React.FC = () => null
export default ThemeCircularRippleOverlay

import React from 'react'
// Point type re-export for backward compatibility
export type { Point } from '../../store/themeStore'
