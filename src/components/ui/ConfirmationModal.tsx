'use client'

import Modal from './Modal'
import Button from './Button'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'success' | 'error' | 'warning'
  isLoading?: boolean
  icon?: React.ReactNode
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  icon
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm()
    // Don't close automatically - let the parent handle it based on success/failure
  }

  const getIconForVariant = (variant: string) => {
    switch (variant) {
      case 'success':
        return (
          <div className="w-12 h-12 mx-auto bg-success-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-12 h-12 mx-auto bg-error-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      case 'warning':
        return (
          <div className="w-12 h-12 mx-auto bg-warning-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-12 h-12 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={!isLoading}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mb-4">
          {icon || getIconForVariant(confirmVariant)}
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-secondary-600 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 order-2 sm:order-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            loading={isLoading}
            className="flex-1 order-1 sm:order-2"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}