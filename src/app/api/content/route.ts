import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/content - Fetch public content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const language = searchParams.get('language') || 'en'
    const tenantId = searchParams.get('tenantId') // For explicit tenant selection
    
    const whereClause: any = {
      language,
      isActive: true
    }

    // If tenantId is specified, filter by it; otherwise get platform-wide content (tenantId: null)
    if (tenantId) {
      whereClause.tenantId = parseInt(tenantId)
    } else {
      whereClause.tenantId = null
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
        contentKey: true,
        category: true,
        language: true,
        title: true,
        content: true,
        contentType: true,
        displayOrder: true
      }
    })
    
    // Transform to a more convenient format
    const contentMap = {}
    content.forEach(row => {
      if (!contentMap[row.category]) {
        contentMap[row.category] = {}
      }
      contentMap[row.category][row.contentKey] = {
        title: row.title,
        content: row.content,
        type: row.contentType
      }
    })

    return NextResponse.json({
      success: true,
      data: contentMap,
      language
    })

  } catch (error) {
    console.error('Error fetching public content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content', message: error.message },
      { status: 500 }
    )
  }
}