// Fontsource variable packages ship a CSS entry point with no type
// declarations, so a bare side-effect import (the form the design system
// mandates) fails TS2882. vite/client only declares "*.css" for relative
// paths, not bare specifiers, so declare the three modules explicitly.
declare module '@fontsource-variable/space-grotesk'
declare module '@fontsource-variable/hanken-grotesk'
declare module '@fontsource-variable/jetbrains-mono'
