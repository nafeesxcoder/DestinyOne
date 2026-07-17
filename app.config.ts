import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'pilot' | 'production';

function resolveVariant(value?: string): AppVariant {
  if (value === 'development' || value === 'pilot' || value === 'production') return value;
  return 'production';
}

export default ({config}: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);
  const easProjectId = process.env.EAS_PROJECT_ID?.trim();
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
  const merchantIdentifiers: Record<AppVariant, string> = {
    development: 'merchant.com.destinyone.app.dev',
    pilot: 'merchant.com.destinyone.app.pilot',
    production: 'merchant.com.destinyone.app',
  };
  const plugins = config.plugins?.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== '@stripe/stripe-react-native') return plugin;
    const options = typeof plugin[1] === 'object' && plugin[1] !== null ? plugin[1] : {};
    return [plugin[0], {...options, merchantIdentifier: merchantIdentifiers[variant]}] as typeof plugin;
  });
  const eas = easProjectId ? {projectId: easProjectId} : undefined;

  return {
    ...config,
    name: names[variant],
    slug: 'destinyone',
    scheme: schemes[variant],
    orientation: 'default',
    plugins,
    extra: {...config.extra, ...(eas ? {eas} : {}), buildVariant: variant},
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
