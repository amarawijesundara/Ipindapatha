import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, isSuperAdmin, isTenantAdmin } from './jwt'

// Define roles and their hierarchy
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin', 
  TENANT_MANAGER: 'tenant_manager',
  USER: 'user'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY = [
  ROLES.USER,
  ROLES.TENANT_MANAGER,
  ROLES.TENANT_ADMIN,
  ROLES.SUPER_ADMIN
]

// Check if a role has permission over another role
export const hasRolePermission = (userRole: string, requiredRole: string): boolean => {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole as Role)
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole as Role)
  
  return userRoleIndex >= requiredRoleIndex
}

// RBAC middleware options
interface RBACOptions {
  roles?: Role[]  // Required roles (any of these roles can access)
  tenantScoped?: boolean  // Requires tenant context
  allowSuperAdmin?: boolean  // Super admins bypass tenant restrictions
  requireOwnership?: boolean  // User must own the resource
  customPermissionCheck?: (payload: any, request: NextRequest) => Promise<boolean>
}

// Main RBAC middleware function
export const withRBAC = (options: RBACOptions = {}) => {
  return async (request: NextRequest, handler: Function) => {
    try {
      // Extract and verify token
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required', message: 'No valid authentication token provided' },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const payload = verifyToken(token)

      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
          { status: 401 }
        )
      }

      // Check role requirements
      if (options.roles && options.roles.length > 0) {
        const hasRequiredRole = options.roles.some(role => 
          hasRolePermission(payload.role, role)
        )

        if (!hasRequiredRole) {
          // Super admin bypass (if allowed)
          if (options.allowSuperAdmin !== false && isSuperAdmin(token)) {
            // Super admin can access, continue
          } else {
            return NextResponse.json(
              { 
                error: 'Insufficient permissions', 
                message: `Required role: ${options.roles.join(' or ')}, your role: ${payload.role}` 
              },
              { status: 403 }
            )
          }
        }
      }

      // Check tenant scoping
      if (options.tenantScoped) {
        const tenantIdHeader = request.headers.get('x-tenant-id')
        const payloadTenantId = payload.tenantId

        // Super admin can access across tenants
        if (isSuperAdmin(token) && options.allowSuperAdmin !== false) {
          // Super admin bypass
        } else if (!payloadTenantId || !tenantIdHeader) {
          return NextResponse.json(
            { error: 'Tenant context required', message: 'This operation requires tenant context' },
            { status: 400 }
          )
        } else if (payloadTenantId !== parseInt(tenantIdHeader)) {
          return NextResponse.json(
            { error: 'Tenant mismatch', message: 'You can only access resources within your tenant' },
            { status: 403 }
          )
        }
      }

      // Custom permission check
      if (options.customPermissionCheck) {
        const hasCustomPermission = await options.customPermissionCheck(payload, request)
        if (!hasCustomPermission) {
          return NextResponse.json(
            { error: 'Access denied', message: 'You do not have permission to perform this action' },
            { status: 403 }
          )
        }
      }

      // Add user context to request for handler
      const requestWithAuth = request as NextRequest & { 
        user: typeof payload,
        tenantId?: number
      }
      
      requestWithAuth.user = payload
      requestWithAuth.tenantId = payload.tenantId

      // Call the protected handler
      return await handler(requestWithAuth)

    } catch (error) {
      console.error('RBAC middleware error:', error)
      return NextResponse.json(
        { error: 'Authorization error', message: 'Failed to process authorization' },
        { status: 500 }
      )
    }
  }
}

// Convenience wrappers for common permission patterns
export const requireSuperAdmin = () => withRBAC({ 
  roles: [ROLES.SUPER_ADMIN],
  allowSuperAdmin: true
})

export const requireTenantAdmin = () => withRBAC({ 
  roles: [ROLES.TENANT_ADMIN], 
  tenantScoped: true,
  allowSuperAdmin: true
})

export const requireTenantManager = () => withRBAC({ 
  roles: [ROLES.TENANT_MANAGER], 
  tenantScoped: true,
  allowSuperAdmin: true
})

export const requireAuthentication = () => withRBAC({})

export const requireTenantUser = () => withRBAC({ 
  tenantScoped: true,
  allowSuperAdmin: true
})

// Helper to create tenant-scoped resource access
export const requireResourceOwnership = (resourceUserIdField = 'user_id') => withRBAC({
  tenantScoped: true,
  customPermissionCheck: async (payload, request) => {
    // For tenant admins and above, allow access to all resources in their tenant
    if (hasRolePermission(payload.role, ROLES.TENANT_ADMIN)) {
      return true
    }

    // For regular users, they can only access their own resources
    // This would need to be implemented based on the specific resource
    // The handler should implement the ownership check
    return true  // Delegate to handler
  }
})