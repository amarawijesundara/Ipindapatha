import bcrypt from 'bcrypt'
import prisma from './db'
import { User, UserCreateInput } from '@/types'

export class UserService {
  // Find user by email or username with explicit tenant scoping
  static async findByEmailOrUsername(identifier: string, tenantId?: number): Promise<User | null> {
    try {
      const whereCondition: any = {
        OR: [
          { email: identifier },
          { username: identifier }
        ],
        isActive: true
      }

      // Apply tenant filtering based on the provided tenantId
      if (tenantId !== undefined) {
        // When tenantId is provided, only search within that tenant
        whereCondition.tenantId = tenantId
      }
      // When tenantId is undefined, search globally (no tenant restriction)

      const user = await prisma.user.findFirst({
        where: whereCondition
      })

      if (user) {
        return {
          id: user.id,
          tenant_id: user.tenantId || undefined,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role as 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager',
          phone_number: user.phoneNumber || undefined,
          address: user.address || undefined,
          is_active: user.isActive,
          created_at: user.createdAt,
          updated_at: user.updatedAt
        }
      }

      return null
    } catch (error) {
      console.error('Error finding user:', error)
      return null
    }
  }

  // Find user by ID with optional tenant scoping
  static async findById(id: number, tenantId?: number): Promise<User | null> {
    try {
      const whereCondition: any = {
        id: id,
        isActive: true
      }

      // If tenantId is provided, scope to tenant
      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      const user = await prisma.user.findFirst({
        where: whereCondition
      })
      
      if (!user) return null
      
      return {
        id: user.id,
        tenant_id: user.tenantId || undefined,
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role as 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager',
        phone_number: user.phoneNumber || undefined,
        address: user.address || undefined,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    } catch (error) {
      console.error('Error finding user by ID:', error)
      return null
    }
  }

  static async create(userData: UserCreateInput): Promise<User | null> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      const user = await prisma.user.create({
        data: {
          tenantId: userData.tenant_id,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role || 'user',
          phoneNumber: userData.phone_number,
          address: userData.address
        }
      })
      
      return {
        id: user.id,
        tenant_id: user.tenantId || undefined,
        username: user.username,
        email: user.email,
        role: user.role as 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager',
        phone_number: user.phoneNumber || undefined,
        address: user.address || undefined,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false
    
    try {
      return await bcrypt.compare(password, user.password)
    } catch (error) {
      console.error('Error verifying password:', error)
      return false
    }
  }

  // Get all users for a tenant
  static async getTenantUsers(tenantId: number): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          tenantId: tenantId,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return users.map(user => ({
        id: user.id,
        tenant_id: user.tenantId || undefined,
        username: user.username,
        email: user.email,
        role: user.role as 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager',
        phone_number: user.phoneNumber || undefined,
        address: user.address || undefined,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }))
    } catch (error) {
      console.error('Error getting tenant users:', error)
      return []
    }
  }

  // Check if username is unique within tenant
  static async isUsernameUnique(username: string, tenantId?: number, excludeUserId?: number): Promise<boolean> {
    try {
      const whereCondition: any = {
        username: username,
        tenantId: tenantId
      }

      if (excludeUserId) {
        whereCondition.id = { not: excludeUserId }
      }

      const existingUser = await prisma.user.findFirst({
        where: whereCondition
      })

      return !existingUser
    } catch (error) {
      console.error('Error checking username uniqueness:', error)
      return false
    }
  }

  // Check if email is unique within tenant
  static async isEmailUnique(email: string, tenantId?: number, excludeUserId?: number): Promise<boolean> {
    try {
      const whereCondition: any = {
        email: email,
        tenantId: tenantId
      }

      if (excludeUserId) {
        whereCondition.id = { not: excludeUserId }
      }

      const existingUser = await prisma.user.findFirst({
        where: whereCondition
      })

      return !existingUser
    } catch (error) {
      console.error('Error checking email uniqueness:', error)
      return false
    }
  }

  // Update user profile
  static async updateProfile(userId: number, updateData: {
    username?: string
    email?: string
    phone_number?: string
    address?: string
  }, tenantId?: number): Promise<User | null> {
    try {
      // Check if username is unique within tenant (if being updated)
      if (updateData.username) {
        const isUnique = await this.isUsernameUnique(updateData.username, tenantId, userId)
        if (!isUnique) {
          throw new Error('Username is already taken')
        }
      }

      // Check if email is unique within tenant (if being updated)
      if (updateData.email) {
        const isUnique = await this.isEmailUnique(updateData.email, tenantId, userId)
        if (!isUnique) {
          throw new Error('Email is already taken')
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          username: updateData.username,
          email: updateData.email,
          phoneNumber: updateData.phone_number,
          address: updateData.address,
          updatedAt: new Date()
        }
      })

      return {
        id: user.id,
        tenant_id: user.tenantId || undefined,
        username: user.username,
        email: user.email,
        password: user.password,
        role: user.role as 'user' | 'admin' | 'super_admin' | 'tenant_admin' | 'tenant_manager',
        phone_number: user.phoneNumber || undefined,
        address: user.address || undefined,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    } catch (error) {
      console.error('Error updating user profile:', error)
      return null
    }
  }

  // Change user password
  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // First verify the current user and password
      const user = await this.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(user, currentPassword)
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect')
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      // Update password in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      })

      return true
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  }

  static toJSON(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }
}