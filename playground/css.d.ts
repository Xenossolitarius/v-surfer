// Dev-only: lets the editor resolve relative `.css` side-effect imports in this
// playground (e.g. the frozen module CSS). The playground is excluded from the
// project typecheck; Vite resolves these natively at runtime.
declare module '*.css';
