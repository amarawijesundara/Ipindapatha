import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { PaymentService } from '@/lib/payments'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to create a payment' },
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

    const body = await request.json()
    const { bookingId, amount, currency, bookingDate } = body

    // Basic validation
    if (!bookingId || !amount || !bookingDate) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking ID, amount, and booking date are required' },
        { status: 400 }
      )
    }

    // Determine tenant context
    let tenantId: number
    if (payload.role === 'super_admin') {
      tenantId = body.tenantId || 1 // Default tenant if not specified
    } else if (payload.tenantId) {
      tenantId = payload.tenantId
    } else {
      tenantId = 1 // Default tenant
    }

    // Calculate payment deadline (2 weeks before booking date)
    const bookingDateObj = new Date(bookingDate)
    const paymentDeadline = PaymentService.calculatePaymentDeadline(bookingDateObj)

    // Check if payment deadline has already passed
    const now = new Date()
    if (paymentDeadline < now) {
      return NextResponse.json(
        { 
          error: 'Payment deadline passed', 
          message: 'The payment deadline for this booking has already passed. Payment must be made at least 2 weeks before the ceremony date.' 
        },
        { status: 400 }
      )
    }

    // Create payment record
    const payment = await PaymentService.createPayment({
      bookingId,
      tenantId,
      userId: payload.userId,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      paymentDeadline
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment creation failed', message: 'Failed to create payment record' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: 'Payment record created successfully',
        payment,
        paymentDeadline: paymentDeadline.toISOString()
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { 
        error: 'Payment creation failed', 
        message: error.message || 'Failed to create payment record' 
      },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'Please sign in to view payments' },
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
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Booking ID is required' },
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

    // Get payment by booking ID
    const payment = await PaymentService.getPaymentByBookingId(
      parseInt(bookingId), 
      tenantId
    )

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found', message: 'No payment record found for this booking' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Payment retrieved successfully',
      payment
    })

  } catch (error) {
    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to retrieve payment' },
      { status: 500 }
    )
  }
}