/// <reference types="vite/client" />

// cytoscape-edgehandles@4.0.1 ships no TypeScript types; this declaration
// satisfies the compiler. The real API is accessed via cy.edgehandles() which
// cytoscape-edgehandles patches onto the Core prototype at registration time.
declare module 'cytoscape-edgehandles'
