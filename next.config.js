const { i18n } = require('./next-i18next.config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  },
  // Allow subdomain origins in development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'niwandakimu.localhost:3000',
      'localhost:3000',
      '*.localhost:3000'
    ]
  }),
  // Support for Sinhala fonts and Unicode
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  },
}

module.exports = nextConfig