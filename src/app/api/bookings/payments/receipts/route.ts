import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { PaymentService } from '@/lib/payments'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to upload receipts' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const paymentId = formData.get('paymentId') as string
    const bookingId = formData.get('bookingId') as string

    // Validate required fields
    if (!file || !paymentId || !bookingId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'File, payment ID, and booking ID are required' },
        { status: 400 }
      )
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large', message: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type', message: 'Only JPEG, PNG, and PDF files are allowed' },
        { status: 400 }
      )
    }

    // Determine tenant context
    let tenantId: number
    if (payload.role === 'super_admin') {
      tenantId = 1 // Default tenant for super admin
    } else if (payload.tenantId) {
      tenantId = payload.tenantId
    } else {
      tenantId = 1 // Default tenant
    }

    // Verify that the payment belongs to the user (security check)
    const existingPayment = await PaymentService.getPaymentByBookingId(
      parseInt(bookingId), 
      tenantId
    )

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Payment not found', message: 'Payment record not found or access denied' },
        { status: 404 }
      )
    }

    // Additional security check: ensure user owns the payment (unless admin)
    if (payload.role !== 'super_admin' && existingPayment.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You can only upload receipts for your own payments' },
        { status: 403 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const baseFileName = file.name.replace(fileExtension, '').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `receipt_${paymentId}_${timestamp}_${baseFileName}${fileExtension}`

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'receipts')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // File path
    const filePath = path.join(uploadDir, fileName)
    const relativePath = path.join('uploads', 'receipts', fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create payment receipt record in database
    const receipt = await PaymentService.createPaymentReceipt(
      parseInt(paymentId),
      tenantId,
      payload.userId,
      fileName,
      file.name,
      relativePath,
      file.size,
      file.type
    )

    if (!receipt) {
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create receipt record' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Receipt uploaded successfully',
        receipt
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Upload receipt error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        message: error.message || 'Failed to upload receipt' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to view receipts' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Authentication token is invalid or expired' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Determine tenant context
    let tenantId: number | undefined
    if (payload.role === 'super_admin') {
      tenantId = undefined // Super admins can access across tenants
    } else if (payload.tenantId) {
      tenantId = payload.tenantId
    } else {
      tenantId = 1 // Default tenant
    }

    // Get payment with receipts
    const payment = await PaymentService.getPaymentByBookingId(
      parseInt(paymentId), 
      tenantId
    )

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found', message: 'Payment record not found' },
        { status: 404 }
      )
    }

    // Security check: ensure user owns the payment (unless admin)
    if (payload.role !== 'super_admin' && payment.user_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You can only view your own payment receipts' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      message: 'Payment receipts retrieved successfully',
      receipts: payment.receipts || []
    })

  } catch (error) {
    console.error('Get payment receipts error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve payment receipts' },
      { status: 500 }
    )
  }
}