import { SignJWT, jwtVerify } from 'jose'
import { JWTPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

// Convert secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET)

// Convert expiry time to seconds
const getExpiryInSeconds = (expiresIn: string): number => {
  if (expiresIn.endsWith('h')) {
    return parseInt(expiresIn.slice(0, -1)) * 3600
  }
  if (expiresIn.endsWith('d')) {
    return parseInt(expiresIn.slice(0, -1)) * 86400
  }
  return 86400 // Default to 24 hours
}

export const generateToken = async (payload: {
  userId: number
  username: string
  email: string
  role: string
  tenantId?: number
  subdomain?: string
}): Promise<string> => {
  const tokenPayload: JWTPayload = {
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    subdomain: payload.subdomain,
    iat: Math.floor(Date.now() / 1000)
  }

  const jwt = await new SignJWT(tokenPayload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + getExpiryInSeconds(JWT_EXPIRES_IN))
    .sign(secret)

  return jwt
}

export const verifyToken = async (token?: string): Promise<JWTPayload | null> => {
  if (!token) return null
  
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as JWTPayload
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

// Helper to extract tenant context from JWT
export const extractTenantFromToken = async (token?: string): Promise<{ tenantId?: number; subdomain?: string } | null> => {
  const payload = await verifyToken(token)
  if (!payload) return null
  
  return {
    tenantId: payload.tenantId,
    subdomain: payload.subdomain
  }
}

// Helper to check if user has required role
export const hasRole = async (token: string, requiredRoles: string[]): Promise<boolean> => {
  const payload = await verifyToken(token)
  if (!payload || !payload.role) return false
  
  return requiredRoles.includes(payload.role)
}

// Helper to check if user is super admin
export const isSuperAdmin = async (token: string): Promise<boolean> => {
  return await hasRole(token, ['super_admin'])
}

// Helper to check if user is tenant admin
export const isTenantAdmin = async (token: string): Promise<boolean> => {
  return await hasRole(token, ['tenant_admin', 'super_admin'])
}