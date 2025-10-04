import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { PaymentService } from '@/lib/payments'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import prisma from '@/lib/db'

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
    const bulkPaymentIds = formData.get('bulkPaymentIds') as string // Comma-separated payment IDs
    const bulkBookingIds = formData.get('bulkBookingIds') as string // Comma-separated booking IDs (for mixed scenarios)

    // Check if this is a bulk upload
    const isBulkUpload = (bulkPaymentIds && bulkPaymentIds.trim() !== '') || (bulkBookingIds && bulkBookingIds.trim() !== '')
    const isMixedBulkUpload = bulkBookingIds && bulkBookingIds.trim() !== ''

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'File is required' },
        { status: 400 }
      )
    }

    if (!isBulkUpload && !bookingId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking ID is required for single uploads' },
        { status: 400 }
      )
    }

    if (isBulkUpload && !bulkPaymentIds && !bulkBookingIds) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Bulk payment IDs or booking IDs are required for bulk uploads' },
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

    // Verify payments and perform security checks
    let paymentsToProcess: { id: number; user_id: number }[] = []

    if (isBulkUpload) {
      if (isMixedBulkUpload) {
        // Handle mixed bulk upload (some bookings may not have payment records)
        const bookingIds = bulkBookingIds.split(',').map(id => parseInt(id.trim()))
        const paymentsCreated = []

        for (const bookingId of bookingIds) {
          // Try to get existing payment
          let existingPayment = await PaymentService.getPaymentByBookingId(bookingId, tenantId)

          if (!existingPayment) {
            // Create payment record for this booking
            const booking = await prisma.booking.findUnique({
              where: { id: bookingId },
              select: {
                id: true,
                userId: true,
                tenantId: true,
                bookingDate: true,
                offeringType: true
              }
            })

            if (!booking) {
              return NextResponse.json(
                { error: 'Booking not found', message: `Booking ${bookingId} not found` },
                { status: 404 }
              )
            }

            // Verify user owns the booking (unless admin)
            if (payload.role !== 'super_admin' && booking.userId !== payload.userId) {
              return NextResponse.json(
                { error: 'Access denied', message: 'You can only upload receipts for your own bookings' },
                { status: 403 }
              )
            }

            if (booking.offeringType === 'monetary_donation') {
              const defaultAmount = 50.00 // This could be made configurable
              existingPayment = await PaymentService.createPaymentForBooking(
                booking.id,
                booking.tenantId,
                booking.userId,
                defaultAmount,
                booking.bookingDate
              )

              if (!existingPayment) {
                return NextResponse.json(
                  { error: 'Payment creation failed', message: `Failed to create payment for booking ${bookingId}` },
                  { status: 500 }
                )
              }
            } else {
              return NextResponse.json(
                { error: 'Invalid booking type', message: 'Only monetary donation bookings can have payment receipts' },
                { status: 400 }
              )
            }
          }

          // Security check: ensure user owns the payment (unless admin)
          if (payload.role !== 'super_admin' && existingPayment.user_id !== payload.userId) {
            return NextResponse.json(
              { error: 'Access denied', message: 'You can only upload receipts for your own payments' },
              { status: 403 }
            )
          }

          paymentsCreated.push({ id: existingPayment.id, user_id: existingPayment.user_id })
        }

        paymentsToProcess = paymentsCreated
      } else {
        // Traditional bulk upload with existing payment IDs
        const paymentIds = bulkPaymentIds.split(',').map(id => parseInt(id.trim()))

        // Get all payments and verify they belong to the user
        const bulkPayments = await PaymentService.getPaymentsByBookingIds(paymentIds, tenantId)

        if (bulkPayments.length === 0) {
          return NextResponse.json(
            { error: 'Payments not found', message: 'No payment records found or access denied' },
            { status: 404 }
          )
        }

        // Security check: ensure user owns all payments (unless admin)
        if (payload.role !== 'super_admin') {
          const unauthorizedPayments = bulkPayments.filter(p => p.user_id !== payload.userId)
          if (unauthorizedPayments.length > 0) {
            return NextResponse.json(
              { error: 'Access denied', message: 'You can only upload receipts for your own payments' },
              { status: 403 }
            )
          }
        }

        paymentsToProcess = bulkPayments.map(p => ({ id: p.id, user_id: p.user_id }))
      }
    } else {
      // Single payment verification or creation
      let existingPayment = await PaymentService.getPaymentByBookingId(
        parseInt(bookingId),
        tenantId
      )

      if (!existingPayment) {
        // Payment record doesn't exist, create one for this booking
        // First, get the booking details to create payment
        const booking = await prisma.booking.findUnique({
          where: { id: parseInt(bookingId) },
          select: {
            id: true,
            userId: true,
            tenantId: true,
            bookingDate: true,
            offeringType: true
          }
        })

        if (!booking) {
          return NextResponse.json(
            { error: 'Booking not found', message: 'Booking record not found' },
            { status: 404 }
          )
        }

        // Verify user owns the booking (unless admin)
        if (payload.role !== 'super_admin' && booking.userId !== payload.userId) {
          return NextResponse.json(
            { error: 'Access denied', message: 'You can only upload receipts for your own bookings' },
            { status: 403 }
          )
        }

        // Create payment record for monetary donation bookings
        if (booking.offeringType === 'monetary_donation') {
          // Default amount (will be determined by tenant settings)
          const defaultAmount = 50.00 // This could be made configurable

          existingPayment = await PaymentService.createPaymentForBooking(
            booking.id,
            booking.tenantId,
            booking.userId,
            defaultAmount,
            booking.bookingDate
          )

          if (!existingPayment) {
            return NextResponse.json(
              { error: 'Payment creation failed', message: 'Failed to create payment record for booking' },
              { status: 500 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Invalid booking type', message: 'Only monetary donation bookings can have payment receipts' },
            { status: 400 }
          )
        }
      }

      // Additional security check: ensure user owns the payment (unless admin)
      if (payload.role !== 'super_admin' && existingPayment.user_id !== payload.userId) {
        return NextResponse.json(
          { error: 'Access denied', message: 'You can only upload receipts for your own payments' },
          { status: 403 }
        )
      }

      paymentsToProcess = [{ id: existingPayment.id, user_id: existingPayment.user_id }]
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const baseFileName = file.name.replace(fileExtension, '').replace(/[^a-zA-Z0-9]/g, '_')
    const uploadType = isBulkUpload ? 'bulk' : 'single'
    const primaryPaymentId = paymentsToProcess[0].id
    const fileName = `receipt_${uploadType}_${primaryPaymentId}_${timestamp}_${baseFileName}${fileExtension}`

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

    // Create payment receipt record(s) in database
    let receipts: any[] = []

    if (isBulkUpload) {
      // Create bulk receipts
      const bulkReceipts = await PaymentService.createBulkPaymentReceipt(
        paymentsToProcess.map(p => p.id),
        tenantId,
        payload.userId,
        fileName,
        file.name,
        relativePath,
        file.size,
        file.type
      )

      if (bulkReceipts.length === 0) {
        return NextResponse.json(
          { error: 'Database error', message: 'Failed to create bulk receipt records' },
          { status: 500 }
        )
      }

      receipts = bulkReceipts
    } else {
      // Create single receipt
      const receipt = await PaymentService.createPaymentReceipt(
        paymentsToProcess[0].id,
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

      receipts = [receipt]
    }

    return NextResponse.json(
      {
        message: isBulkUpload
          ? `Receipt uploaded successfully for ${receipts.length} payments`
          : 'Receipt uploaded successfully',
        receipts,
        bulkUpload: isBulkUpload,
        paymentCount: receipts.length
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