const crypto = require('crypto')

const configuredSecret = process.env.JWT_SECRET || process.env.SECRET_KEY
const isProduction = process.env.NODE_ENV === 'production'
const fallbackSecret = crypto.randomBytes(48).toString('hex')

const jwtSecret = configuredSecret || (isProduction ? null : fallbackSecret)

if (!jwtSecret) {
  throw new Error('JWT secret is required in production. Set JWT_SECRET or SECRET_KEY.')
}

if (!configuredSecret && !isProduction) {
  console.warn('JWT_SECRET/SECRET_KEY not configured; using an ephemeral development secret.')
}

const getJwtSecret = () => jwtSecret

module.exports = { getJwtSecret }
