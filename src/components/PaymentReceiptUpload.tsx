'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui'

interface PaymentReceiptUploadProps {
  paymentId: number
  bookingId: number
  onUploadSuccess: (receiptData: any) => void
  onCancel?: () => void
  disabled?: boolean
}

interface UploadProgress {
  progress: number
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function PaymentReceiptUpload({
  paymentId,
  bookingId,
  onUploadSuccess,
  onCancel,
  disabled = false
}: PaymentReceiptUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    status: 'idle'
  })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

    if (file.size > maxSize) {
      return 'File size must be less than 10MB'
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and PDF files are allowed'
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      setUploadProgress({
        progress: 0,
        status: 'error',
        error
      })
      return
    }

    setSelectedFile(file)
    setUploadProgress({
      progress: 0,
      status: 'idle'
    })
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || uploadProgress.status === 'uploading') return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  }

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile || uploadProgress.status === 'uploading') return

    setUploadProgress({
      progress: 0,
      status: 'uploading'
    })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('paymentId', paymentId.toString())
      formData.append('bookingId', bookingId.toString())

      const response = await fetch('/api/bookings/payments/receipts', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Upload failed')
      }

      const result = await response.json()
      
      setUploadProgress({
        progress: 100,
        status: 'success'
      })

      // Call success callback
      onUploadSuccess(result.receipt)

      // Reset after a short delay
      setTimeout(() => {
        setSelectedFile(null)
        setUploadProgress({
          progress: 0,
          status: 'idle'
        })
      }, 2000)

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadProgress({
        progress: 0,
        status: 'error',
        error: error.message || 'Upload failed. Please try again.'
      })
    }
  }

  // Reset upload
  const handleReset = () => {
    setSelectedFile(null)
    setUploadProgress({
      progress: 0,
      status: 'idle'
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white border border-monastery-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <div className="text-2xl mb-2">📄</div>
        <h3 className="text-lg font-semibold text-monastery-800 mb-2">
          Upload Payment Receipt
        </h3>
        <p className="text-sm text-monastery-600">
          Upload your payment receipt or bank transfer confirmation for verification
        </p>
      </div>

      {/* File Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${dragActive 
            ? 'border-primary-400 bg-primary-50' 
            : selectedFile
              ? 'border-green-300 bg-green-50'
              : 'border-monastery-300 bg-monastery-50 hover:border-primary-300 hover:bg-primary-50'
          }
          ${disabled || uploadProgress.status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && uploadProgress.status !== 'uploading' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileInputChange}
          disabled={disabled || uploadProgress.status === 'uploading'}
        />

        {selectedFile ? (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <div className="font-medium text-green-800 mb-2">
              {selectedFile.name}
            </div>
            <div className="text-sm text-green-600">
              {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1].toUpperCase()}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📎</div>
            <div className="text-monastery-800 font-medium mb-2">
              Drop your receipt here or click to browse
            </div>
            <div className="text-sm text-monastery-600">
              Supports: JPEG, PNG, PDF (max 10MB)
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.status === 'uploading' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-monastery-700">Uploading...</span>
            <span className="text-sm text-monastery-600">{uploadProgress.progress}%</span>
          </div>
          <div className="w-full bg-monastery-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadProgress.status === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Receipt uploaded successfully!</p>
              <p className="text-sm text-green-600 mt-1">
                Your receipt has been submitted for review. You&apos;ll be notified once it&apos;s verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadProgress.status === 'error' && uploadProgress.error && (
        <div className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-error-700">Upload Failed</p>
              <p className="text-sm text-error-600 mt-1">{uploadProgress.error}</p>
            </div>
            <button
              type="button"
              onClick={() => setUploadProgress({ progress: 0, status: 'idle' })}
              className="flex-shrink-0 ml-2 text-error-400 hover:text-error-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            fullWidth
            disabled={uploadProgress.status === 'uploading'}
          >
            Cancel
          </Button>
        )}
        
        {selectedFile && uploadProgress.status === 'idle' && (
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={uploadProgress.status === 'uploading'}
          >
            Remove File
          </Button>
        )}
        
        <Button
          type="button"
          onClick={handleUpload}
          fullWidth
          disabled={!selectedFile || uploadProgress.status === 'uploading' || disabled}
          loading={uploadProgress.status === 'uploading'}
          className="bg-primary-500 hover:bg-primary-600"
        >
          {uploadProgress.status === 'uploading' ? 'Uploading...' : 'Upload Receipt'}
        </Button>
      </div>

      {/* File Requirements */}
      <div className="mt-6 p-4 bg-monastery-50 rounded-lg">
        <h4 className="text-sm font-medium text-monastery-800 mb-2">📋 Requirements</h4>
        <ul className="text-xs text-monastery-600 space-y-1">
          <li>• File formats: JPEG, PNG, or PDF</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Receipt should clearly show payment amount and date</li>
          <li>• Include transaction reference or confirmation number if available</li>
        </ul>
      </div>
    </div>
  )
}