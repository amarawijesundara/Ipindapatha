'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthContext'
import { Container, Button } from '@/components/ui'
import MonasteryCalendar from '@/components/MonasteryCalendar'
import DhaneBookingModal from '@/components/DhaneBookingModal'

export default function Home() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  
  useEffect(() => {
    // Check for pending booking after authentication
    if (user) {
      const pendingBooking = localStorage.getItem('pendingBooking')
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking)
          // Set the selected date and open booking modal
          setSelectedDate(new Date(bookingData.date))
          setShowBookingModal(true)
        } catch (error) {
          console.error('Error parsing pending booking:', error)
          localStorage.removeItem('pendingBooking')
        }
      }
    }
  }, [user])

  const handleDateSelect = (date: Date) => {
    // Allow both guests and authenticated users to select dates
    // The booking modal will handle authentication flow
    setSelectedDate(date)
    setShowBookingModal(true)
  }

  const handleBookingComplete = () => {
    // Refresh calendar data
    window.location.reload()
  }

  const handleCloseModal = () => {
    setShowBookingModal(false)
    setSelectedDate(null)
  }

  return (
    <div className="min-h-screen bg-lotus-50">
      {/* Hero Section */}
      <section className="relative py-8 sm:py-12">
        <Container size="lg">
          <div className="text-center fade-in mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="text-6xl mr-4">🏛️</div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-monastery-800 mb-2">
                  Monastery Dhane Booking
                </h1>
                <p className="text-lg text-monastery-600">
                  Book your offering ceremony with devotion
                </p>
              </div>
            </div>
            
            {user ? (
              <div className="bg-gradient-to-r from-lotus-100 to-primary-50 rounded-2xl p-4 max-w-lg mx-auto border border-primary-200">
                <p className="text-monastery-800">
                  Welcome, <span className="font-semibold text-primary-700">{user.username}</span>
                </p>
                <p className="text-sm text-monastery-600">
                  Select a date below to book your Dhane offering ceremony
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-warning-50 to-accent-50 rounded-2xl p-4 max-w-lg mx-auto border border-warning-200">
                <p className="text-monastery-800 mb-2">
                  Please sign in to book your Dhane offering ceremony
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild size="sm">
                    <Link href="/login">
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/register">
                      Create Account
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Calendar Section */}
      <section className="py-8">
        <Container size="xl">
          <MonasteryCalendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </Container>
      </section>

      {/* Information Section */}
      <section className="py-12 bg-gradient-to-r from-monastery-50 to-lotus-100">
        <Container size="lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-monastery-800 mb-4">
              About Dhane Offerings
            </h2>
            <p className="text-monastery-700 max-w-3xl mx-auto leading-relaxed">
              Dhane is a Buddhist practice of offering food and necessities to monks. 
              It's a meritorious act that brings spiritual benefits to the devotee and supports the monastic community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">🙏</div>
              <h3 className="font-semibold text-monastery-800 mb-2">Book Your Ceremony</h3>
              <p className="text-sm text-monastery-600">
                Select an available date and time for your offering ceremony
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">🍚</div>
              <h3 className="font-semibold text-monastery-800 mb-2">Prepare Offerings</h3>
              <p className="text-sm text-monastery-600">
                Bring rice, curry, fruits, and other necessities for the monks
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-monastery-800 mb-2">Earn Merit</h3>
              <p className="text-sm text-monastery-600">
                Gain spiritual merit through your generous offering to the Sangha
              </p>
            </div>
          </div>

          {user && (
            <div className="text-center mt-8">
              <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600">
                <Link href="/dashboard">
                  View My Bookings
                </Link>
              </Button>
            </div>
          )}
        </Container>
      </section>

      {/* Booking Modal */}
      {showBookingModal && (
        <DhaneBookingModal
          selectedDate={selectedDate}
          onClose={handleCloseModal}
          onBookingComplete={handleBookingComplete}
        />
      )}
    </div>
  )
}