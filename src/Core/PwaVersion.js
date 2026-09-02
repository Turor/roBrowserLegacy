/**
 * Build-time PWA stamp. Vite define replaces __TURORAN_PWA_VERSION__.
 */
export const PWA_VERSION =
	typeof __TURORAN_PWA_VERSION__ !== 'undefined' ? __TURORAN_PWA_VERSION__ : 'dev';
