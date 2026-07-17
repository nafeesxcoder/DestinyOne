import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'pilot' | 'production';

function resolveVariant(value?: string): AppVariant {
  if (value === 'development' || value === 'pilot' || value === 'production') return value;
  return 'production';
}

export default ({config}: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const identifiers: Record<AppVariant, string> = {
    development: 'com.destinyone.app.dev',
    pilot: 'com.destinyone.app.pilot',
    production: 'com.destinyone.app',
  };
  const names: Record<AppVariant, string> = {
    development: 'DestinyOne Dev',
    pilot: 'DestinyOne Pilot',
    production: 'DestinyOne',
  };
  const schemes: Record<AppVariant, string> = {
    development: 'destinyone-dev',
    pilot: 'destinyone-pilot',
    production: 'destinyone',
  };

  return {
    ...config,
    name: names[variant],
    slug: 'destinyone',
    scheme: schemes[variant],
    extra: {...config.extra, buildVariant: variant},
    ios: {
      ...config.ios,
      supportsTablet: true,
      bundleIdentifier: identifiers[variant],
    },
    android: {
      ...config.android,
      package: identifiers[variant],
    },
  };
};
