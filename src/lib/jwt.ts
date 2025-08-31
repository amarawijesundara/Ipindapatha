import jwt, { SignOptions } from 'jsonwebtoken'
import { JWTPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export const generateToken = (payload: {
  userId: number
  username: string
  email: string
  role: string
  tenantId?: number
  subdomain?: string
}): string => {
  const tokenPayload: JWTPayload = {
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    subdomain: payload.subdomain,
    iat: Math.floor(Date.now() / 1000)
  }

  return jwt.sign(tokenPayload as object, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export const verifyToken = (token?: string): JWTPayload | null => {
  if (!token) return null
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

// Helper to extract tenant context from JWT
export const extractTenantFromToken = (token?: string): { tenantId?: number; subdomain?: string } | null => {
  const payload = verifyToken(token)
  if (!payload) return null
  
  return {
    tenantId: payload.tenantId,
    subdomain: payload.subdomain
  }
}

// Helper to check if user has required role
export const hasRole = (token: string, requiredRoles: string[]): boolean => {
  const payload = verifyToken(token)
  if (!payload || !payload.role) return false
  
  return requiredRoles.includes(payload.role)
}

// Helper to check if user is super admin
export const isSuperAdmin = (token: string): boolean => {
  return hasRole(token, ['super_admin'])
}

// Helper to check if user is tenant admin
export const isTenantAdmin = (token: string): boolean => {
  return hasRole(token, ['tenant_admin', 'super_admin'])
}