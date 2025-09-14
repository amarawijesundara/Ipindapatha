module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'si'],
    localeDetection: false
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  // Enable fallback languages
  fallbackLng: {
    'si': ['en'],
    default: ['en']
  },
  // Separate namespaces for better organization
  ns: ['common', 'auth', 'booking', 'account', 'payment', 'admin'],
  defaultNS: 'common',
  // Load all namespaces on client side
  partialBundledLanguages: true
}