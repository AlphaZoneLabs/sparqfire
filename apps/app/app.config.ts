import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // eas init can write extra.eas.projectId to app.json. CI can supply it instead.
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const release = process.env.SPARQFIRE_RELEASE === '1';
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('EAS_PROJECT_ID must be the UUID of your Expo project.');
  }
  if (release) {
    if (!projectId) throw new Error('Link your Expo project (extra.eas.projectId in app.json or EAS_PROJECT_ID) before releasing iOS.');
    const apiUrl = new URL(process.env.EXPO_PUBLIC_API_URL || 'http://localhost');
    if (apiUrl.protocol !== 'https:' || /^(localhost|127\.|\[?::1\]?)/i.test(apiUrl.hostname) || apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash || apiUrl.pathname !== '/') {
      throw new Error('EXPO_PUBLIC_API_URL must be your deployed HTTPS Worker origin before releasing iOS.');
    }
  }

  return {
    ...config,
    name: config.name || 'SparQFire',
    slug: config.slug || 'sparqfire',
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      ...config.updates,
      enabled: Boolean(projectId),
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
      checkAutomatically: 'ON_LOAD',
      // Launch the embedded/cached app immediately; apply downloads next launch.
      fallbackToCacheTimeout: 0,
    },
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
  };
};
