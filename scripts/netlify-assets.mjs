// The published Lovable app. Netlify has no game server key and no Lovable image paths,
// so the Netlify site forwards images (/__l5e/*) and game requests (/_serverFn/*) here.
// Publish on Lovable after changing game/server code so both sites run the same version.
export const LOVABLE_APP_ORIGIN = 'https://master-poker-migration-studio.lovable.app';
