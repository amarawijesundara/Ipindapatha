import prisma from './db'
import { PaymentCreateInput, BookingPayment, PaymentReceipt, PaymentWithReceipts } from '@/types'
import { TenantService } from './tenant'

export class PaymentService {
  // Calculate payment deadline (2 weeks before booking date)
  static calculatePaymentDeadline(bookingDate: Date): Date {
    const deadline = new Date(bookingDate)
    deadline.setDate(deadline.getDate() - 14) // 2 weeks before
    deadline.setHours(23, 59, 59, 999) // End of day
    return deadline
  }

  // Create a payment record for a booking
  static async createPayment(input: PaymentCreateInput): Promise<BookingPayment | null> {
    try {
      // Get tenant-specific currency if not provided
      let currency = input.currency
      if (!currency) {
        currency = await TenantService.getTenantCurrency(input.tenantId)
      }

      const payment = await prisma.bookingPayment.create({
        data: {
          bookingId: input.bookingId,
          tenantId: input.tenantId,
          userId: input.userId,
          amount: input.amount,
          currency: currency,
          paymentDeadline: input.paymentDeadline,
          status: 'pending'
        }
      })

      return {
        id: payment.id,
        booking_id: payment.bookingId,
        tenant_id: payment.tenantId,
        user_id: payment.userId,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        payment_deadline: payment.paymentDeadline,
        status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
        paid_at: payment.paidAt || undefined,
        verified_at: payment.verifiedAt || undefined,
        verified_by: payment.verifiedBy || undefined,
        notes: payment.notes || undefined,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      return null
    }
  }

  // Get payment by booking ID
  static async getPaymentByBookingId(bookingId: number, tenantId?: number): Promise<PaymentWithReceipts | null> {
    try {
      const payment = await prisma.bookingPayment.findUnique({
        where: { bookingId },
        include: {
          receipts: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      // If tenantId is specified, verify it matches
      if (payment && tenantId !== undefined && payment.tenantId !== tenantId) {
        return null
      }

      if (!payment) return null

      return {
        id: payment.id,
        booking_id: payment.bookingId,
        tenant_id: payment.tenantId,
        user_id: payment.userId,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        payment_deadline: payment.paymentDeadline,
        status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
        paid_at: payment.paidAt || undefined,
        verified_at: payment.verifiedAt || undefined,
        verified_by: payment.verifiedBy || undefined,
        notes: payment.notes || undefined,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt,
        receipts: payment.receipts.map(receipt => ({
          id: receipt.id,
          payment_id: receipt.paymentId,
          tenant_id: receipt.tenantId,
          user_id: receipt.userId,
          file_name: receipt.fileName,
          original_name: receipt.originalName,
          file_path: receipt.filePath,
          file_size: receipt.fileSize,
          mime_type: receipt.mimeType,
          status: receipt.status as 'pending' | 'approved' | 'rejected',
          rejection_reason: receipt.rejectionReason || undefined,
          reviewed_at: receipt.reviewedAt || undefined,
          reviewed_by: receipt.reviewedBy || undefined,
          created_at: receipt.createdAt,
          updated_at: receipt.updatedAt
        }))
      }
    } catch (error) {
      console.error('Error getting payment by booking ID:', error)
      return null
    }
  }

  // Get multiple payments by booking IDs (for bulk operations)
  static async getPaymentsByBookingIds(bookingIds: number[], tenantId?: number): Promise<PaymentWithReceipts[]> {
    try {
      const whereCondition: any = {
        bookingId: { in: bookingIds }
      }
      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      const payments = await prisma.bookingPayment.findMany({
        where: whereCondition,
        include: {
          receipts: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { bookingId: 'asc' }
      })

      return payments.map(payment => ({
        id: payment.id,
        booking_id: payment.bookingId,
        tenant_id: payment.tenantId,
        user_id: payment.userId,
        amount: parseFloat(payment.amount.toString()),
        currency: payment.currency,
        payment_deadline: payment.paymentDeadline.toISOString(),
        status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
        paid_at: payment.paidAt?.toISOString() || undefined,
        verified_at: payment.verifiedAt?.toISOString() || undefined,
        verified_by: payment.verifiedBy || undefined,
        notes: payment.notes || undefined,
        created_at: payment.createdAt.toISOString(),
        updated_at: payment.updatedAt.toISOString(),
        receipts: payment.receipts.map(receipt => ({
          id: receipt.id,
          payment_id: receipt.paymentId,
          tenant_id: receipt.tenantId,
          user_id: receipt.userId,
          file_name: receipt.fileName,
          original_name: receipt.originalName,
          file_path: receipt.filePath,
          file_size: receipt.fileSize,
          mime_type: receipt.mimeType,
          status: receipt.status as 'pending' | 'approved' | 'rejected',
          rejection_reason: receipt.rejectionReason || undefined,
          reviewed_at: receipt.reviewedAt?.toISOString() || undefined,
          reviewed_by: receipt.reviewedBy || undefined,
          created_at: receipt.createdAt.toISOString(),
          updated_at: receipt.updatedAt.toISOString()
        }))
      }))
    } catch (error) {
      console.error('Error getting payments by booking IDs:', error)
      return []
    }
  }

  // Get payments grouped by date for a user (for bulk payment operations)
  static async getPaymentsGroupedByDate(userId: number, tenantId?: number): Promise<Record<string, PaymentWithReceipts[]>> {
    try {
      // First get all bookings with payments for this user
      const whereCondition: any = {
        userId,
        offeringType: 'monetary_donation',
        status: { in: ['pending', 'confirmed'] }
      }
      if (tenantId !== undefined) {
        whereCondition.tenantId = tenantId
      }

      const bookingsWithPayments = await prisma.booking.findMany({
        where: whereCondition,
        include: {
          bookingPayment: {
            include: {
              receipts: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        },
        orderBy: { bookingDate: 'asc' }
      })

      // Group by date
      const groupedPayments: Record<string, PaymentWithReceipts[]> = {}

      for (const booking of bookingsWithPayments) {
        if (booking.bookingPayment) {
          const dateKey = booking.bookingDate.toISOString().split('T')[0] // YYYY-MM-DD format

          if (!groupedPayments[dateKey]) {
            groupedPayments[dateKey] = []
          }

          const payment = booking.bookingPayment
          groupedPayments[dateKey].push({
            id: payment.id,
            booking_id: payment.bookingId,
            tenant_id: payment.tenantId,
            user_id: payment.userId,
            amount: parseFloat(payment.amount.toString()),
            currency: payment.currency,
            payment_deadline: payment.paymentDeadline.toISOString(),
            status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
            paid_at: payment.paidAt?.toISOString() || undefined,
            verified_at: payment.verifiedAt?.toISOString() || undefined,
            verified_by: payment.verifiedBy || undefined,
            notes: payment.notes || undefined,
            created_at: payment.createdAt.toISOString(),
            updated_at: payment.updatedAt.toISOString(),
            receipts: payment.receipts.map(receipt => ({
              id: receipt.id,
              payment_id: receipt.paymentId,
              tenant_id: receipt.tenantId,
              user_id: receipt.userId,
              file_name: receipt.fileName,
              original_name: receipt.originalName,
              file_path: receipt.filePath,
              file_size: receipt.fileSize,
              mime_type: receipt.mimeType,
              status: receipt.status as 'pending' | 'approved' | 'rejected',
              rejection_reason: receipt.rejectionReason || undefined,
              reviewed_at: receipt.reviewedAt?.toISOString() || undefined,
              reviewed_by: receipt.reviewedBy || undefined,
              created_at: receipt.createdAt.toISOString(),
              updated_at: receipt.updatedAt.toISOString()
            }))
          })
        }
      }

      return groupedPayments
    } catch (error) {
      console.error('Error getting payments grouped by date:', error)
      return {}
    }
  }

  // Update payment status (for admin verification)
  static async updatePaymentStatus(
    paymentId: number, 
    status: 'paid' | 'verified' | 'overdue' | 'cancelled',
    verifiedBy?: number,
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      }

      if (status === 'paid') {
        updateData.paidAt = new Date()
      } else if (status === 'verified' && verifiedBy) {
        updateData.verifiedAt = new Date()
        updateData.verifiedBy = verifiedBy
      }

      if (notes) {
        updateData.notes = notes
      }

      await prisma.bookingPayment.update({
        where: { id: paymentId },
        data: updateData
      })

      return true
    } catch (error) {
      console.error('Error updating payment status:', error)
      return false
    }
  }

  // Create payment receipt record
  static async createPaymentReceipt(
    paymentId: number,
    tenantId: number,
    userId: number,
    fileName: string,
    originalName: string,
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<PaymentReceipt | null> {
    try {
      const receipt = await prisma.paymentReceipt.create({
        data: {
          paymentId,
          tenantId,
          userId,
          fileName,
          originalName,
          filePath,
          fileSize,
          mimeType,
          status: 'pending'
        }
      })

      // Also update payment status to 'paid' when receipt is uploaded
      await this.updatePaymentStatus(paymentId, 'paid')

      return {
        id: receipt.id,
        payment_id: receipt.paymentId,
        tenant_id: receipt.tenantId,
        user_id: receipt.userId,
        file_name: receipt.fileName,
        original_name: receipt.originalName,
        file_path: receipt.filePath,
        file_size: receipt.fileSize,
        mime_type: receipt.mimeType,
        status: receipt.status as 'pending' | 'approved' | 'rejected',
        rejection_reason: receipt.rejectionReason || undefined,
        reviewed_at: receipt.reviewedAt || undefined,
        reviewed_by: receipt.reviewedBy || undefined,
        created_at: receipt.createdAt,
        updated_at: receipt.updatedAt
      }
    } catch (error) {
      console.error('Error creating payment receipt:', error)
      return null
    }
  }

  // Create bulk payment receipts (one receipt for multiple payments on same date)
  static async createBulkPaymentReceipt(
    paymentIds: number[],
    tenantId: number,
    userId: number,
    fileName: string,
    originalName: string,
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<PaymentReceipt[]> {
    try {
      const receipts: PaymentReceipt[] = []

      // Create a receipt for each payment
      for (const paymentId of paymentIds) {
        const receipt = await prisma.paymentReceipt.create({
          data: {
            paymentId,
            tenantId,
            userId,
            fileName,
            originalName,
            filePath,
            fileSize,
            mimeType,
            status: 'pending'
          }
        })

        // Update payment status to 'paid'
        await this.updatePaymentStatus(paymentId, 'paid')

        receipts.push({
          id: receipt.id,
          payment_id: receipt.paymentId,
          tenant_id: receipt.tenantId,
          user_id: receipt.userId,
          file_name: receipt.fileName,
          original_name: receipt.originalName,
          file_path: receipt.filePath,
          file_size: receipt.fileSize,
          mime_type: receipt.mimeType,
          status: receipt.status as 'pending' | 'approved' | 'rejected',
          rejection_reason: receipt.rejectionReason || undefined,
          reviewed_at: receipt.reviewedAt || undefined,
          reviewed_by: receipt.reviewedBy || undefined,
          created_at: receipt.createdAt,
          updated_at: receipt.updatedAt
        })
      }

      return receipts
    } catch (error) {
      console.error('Error creating bulk payment receipts:', error)
      return []
    }
  }

  // Get all payments for a tenant (admin dashboard)
  static async getTenantPayments(tenantId: number): Promise<PaymentWithReceipts[]> {
    try {
      const payments = await prisma.bookingPayment.findMany({
        where: { tenantId },
        include: {
          receipts: {
            orderBy: { createdAt: 'desc' }
          },
          booking: {
            select: {
              bookingDate: true,
              bookingTime: true,
              eventNote: true
            }
          },
          user: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: [
          { paymentDeadline: 'asc' },
          { createdAt: 'desc' }
        ]
      })

      return payments.map(payment => ({
        id: payment.id,
        booking_id: payment.bookingId,
        tenant_id: payment.tenantId,
        user_id: payment.userId,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        payment_deadline: payment.paymentDeadline,
        status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
        paid_at: payment.paidAt || undefined,
        verified_at: payment.verifiedAt || undefined,
        verified_by: payment.verifiedBy || undefined,
        notes: payment.notes || undefined,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt,
        receipts: payment.receipts.map(receipt => ({
          id: receipt.id,
          payment_id: receipt.paymentId,
          tenant_id: receipt.tenantId,
          user_id: receipt.userId,
          file_name: receipt.fileName,
          original_name: receipt.originalName,
          file_path: receipt.filePath,
          file_size: receipt.fileSize,
          mime_type: receipt.mimeType,
          status: receipt.status as 'pending' | 'approved' | 'rejected',
          rejection_reason: receipt.rejectionReason || undefined,
          reviewed_at: receipt.reviewedAt || undefined,
          reviewed_by: receipt.reviewedBy || undefined,
          created_at: receipt.createdAt,
          updated_at: receipt.updatedAt
        }))
      }))
    } catch (error) {
      console.error('Error getting tenant payments:', error)
      return []
    }
  }

  // Review payment receipt (admin function)
  static async reviewReceipt(
    receiptId: number,
    status: 'approved' | 'rejected',
    reviewedBy: number,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        reviewedAt: new Date(),
        reviewedBy
      }

      if (status === 'rejected' && rejectionReason) {
        updateData.rejectionReason = rejectionReason
      }

      await prisma.paymentReceipt.update({
        where: { id: receiptId },
        data: updateData
      })

      // If approved, also verify the payment
      if (status === 'approved') {
        const receipt = await prisma.paymentReceipt.findUnique({
          where: { id: receiptId },
          select: { paymentId: true }
        })

        if (receipt) {
          await this.updatePaymentStatus(receipt.paymentId, 'verified', reviewedBy)
        }
      }

      return true
    } catch (error) {
      console.error('Error reviewing receipt:', error)
      return false
    }
  }

  // Check for overdue payments (to be run periodically)
  static async markOverduePayments(): Promise<number> {
    try {
      const currentDate = new Date()

      const result = await prisma.bookingPayment.updateMany({
        where: {
          status: 'pending',
          paymentDeadline: {
            lt: currentDate
          }
        },
        data: {
          status: 'overdue',
          updatedAt: currentDate
        }
      })

      return result.count
    } catch (error) {
      console.error('Error marking overdue payments:', error)
      return 0
    }
  }

  // Create payment record for booking without existing payment (for recurring bookings, etc.)
  static async createPaymentForBooking(
    bookingId: number,
    tenantId: number,
    userId: number,
    amount: number,
    bookingDate: Date
  ): Promise<BookingPayment | null> {
    try {
      // Get tenant-specific currency
      const currency = await TenantService.getTenantCurrency(tenantId)

      // Calculate payment deadline (2 weeks before booking date)
      const paymentDeadline = this.calculatePaymentDeadline(bookingDate)

      const payment = await prisma.bookingPayment.create({
        data: {
          bookingId: bookingId,
          tenantId: tenantId,
          userId: userId,
          amount: amount,
          currency: currency,
          paymentDeadline: paymentDeadline,
          status: 'pending'
        }
      })

      return {
        id: payment.id,
        booking_id: payment.bookingId,
        tenant_id: payment.tenantId,
        user_id: payment.userId,
        amount: payment.amount.toNumber(),
        currency: payment.currency,
        payment_deadline: payment.paymentDeadline,
        status: payment.status as 'pending' | 'paid' | 'verified' | 'overdue' | 'cancelled',
        paid_at: payment.paidAt || undefined,
        verified_at: payment.verifiedAt || undefined,
        verified_by: payment.verifiedBy || undefined,
        notes: payment.notes || undefined,
        created_at: payment.createdAt,
        updated_at: payment.updatedAt
      }
    } catch (error) {
      console.error('Error creating payment for booking:', error)
      return null
    }
  }
}