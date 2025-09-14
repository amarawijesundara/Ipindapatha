import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import prisma from '@/lib/db'

// GET /api/admin/content - Fetch all editable content
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'tenant_admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const language = searchParams.get('language') || 'en'

    const whereClause: any = {
      language,
      isActive: true
    }

    // Filter by tenant for tenant admins, super admins see all content
    if (payload.role === 'tenant_admin') {
      if (!payload.tenantId) {
        return NextResponse.json(
          { error: 'Tenant admin must be associated with a tenant' },
          { status: 400 }
        )
      }
      whereClause.tenantId = payload.tenantId
    }

    if (category) {
      whereClause.category = category
    }

    const content = await prisma.siteContent.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
        { contentKey: 'asc' }
      ],
      select: {
        id: true,
        contentKey: true,
        category: true,
        language: true,
        title: true,
        content: true,
        contentType: true,
        displayOrder: true,
        isActive: true,
        updatedAt: true,
        updatedBy: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: content
    })

  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content', message: error.message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/content - Update content items
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token)
    
    if (!payload || (payload.role !== 'super_admin' && payload.role !== 'tenant_admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { content } = await request.json()

    if (!content || !Array.isArray(content)) {
      return NextResponse.json(
        { error: 'Content array is required' },
        { status: 400 }
      )
    }

    // Determine tenant ID for content operations
    const contentTenantId = payload.role === 'tenant_admin' ? payload.tenantId : null

    // Validate tenant admin has tenantId
    if (payload.role === 'tenant_admin' && !contentTenantId) {
      return NextResponse.json(
        { error: 'Tenant admin must be associated with a tenant' },
        { status: 400 }
      )
    }

    // Use Prisma transaction for bulk operations
    await prisma.$transaction(async (tx) => {
      // Update or insert content items
      for (const item of content) {
        const {
          content_key,
          category,
          language = 'en',
          title,
          content: itemContent,
          content_type = 'text',
          display_order = 0,
          is_active = true
        } = item

        if (!content_key || !category) {
          continue // Skip invalid items
        }

        await tx.siteContent.upsert({
          where: {
            tenantId_contentKey_language: {
              tenantId: contentTenantId,
              contentKey: content_key,
              language
            }
          },
          update: {
            category,
            title,
            content: itemContent,
            contentType: content_type,
            displayOrder: display_order,
            isActive: is_active,
            updatedBy: payload.userId
          },
          create: {
            tenantId: contentTenantId,
            contentKey: content_key,
            category,
            language,
            title,
            content: itemContent,
            contentType: content_type,
            displayOrder: display_order,
            isActive: is_active,
            updatedBy: payload.userId
          }
        })
      }

      // Log admin action
      await tx.adminAuditLog.create({
        data: {
          userId: payload.userId,
          action: 'update_content',
          targetType: 'site_content',
          details: { updated_items: content.length }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Content updated successfully'
    })

  } catch (error) {
    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Failed to update content', message: error.message },
      { status: 500 }
    )
  }
}