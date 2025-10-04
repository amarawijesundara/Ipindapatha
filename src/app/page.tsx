'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthContext'
import { useLanguage } from '@/components/LanguageContext'
import { useContent } from '@/components/ContentContext'
import { Container, Button } from '@/components/ui'
import MonasteryCalendar from '@/components/MonasteryCalendar'
import DhaneBookingModal from '@/components/DhaneBookingModal'
import { parseBookingDate } from '@/lib/utils/dateValidation'

export default function Home() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { getContent, loading: contentLoading } = useContent()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  
  useEffect(() => {
    // Check for pending booking after authentication
    if (user) {
      const pendingBooking = localStorage.getItem('pendingBooking')
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking)
          // Set the selected date and open booking modal using timezone-safe parsing
          const parsedDate = parseBookingDate(bookingData.date) || new Date(bookingData.date)
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate)
            setShowBookingModal(true)
          } else {
            console.error('Invalid date in pending booking:', bookingData.date)
            localStorage.removeItem('pendingBooking')
          }
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
    // Refresh calendar data without page reload to maintain authentication state
    setShowBookingModal(false)
    setSelectedDate(null)

    // Trigger calendar refresh by incrementing the refresh key
    setCalendarRefreshKey(prev => prev + 1)
  }

  const handleAvailabilityChange = () => {
    // Trigger calendar refresh when modal detects stale availability data
    setCalendarRefreshKey(prev => prev + 1)
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
                  {getContent('site_info', 'site_name', t('home.title'))}
                </h1>
                <p className="text-lg text-monastery-600">
                  {getContent('site_info', 'site_subtitle', t('home.subtitle'))}
                </p>
              </div>
            </div>
            
            {user ? (
              <div className="bg-gradient-to-r from-lotus-100 to-primary-50 rounded-2xl p-4 max-w-lg mx-auto border border-primary-200">
                <p className="text-monastery-800">
                  {getContent('home_content', 'welcome_message', t('home.welcomeUser', { username: user.username })).replace('{{username}}', user.username)}
                </p>
                <p className="text-sm text-monastery-600">
                  {getContent('home_content', 'select_date_prompt', t('home.selectDatePrompt'))}
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-warning-50 to-accent-50 rounded-2xl p-4 max-w-lg mx-auto border border-warning-200">
                <p className="text-monastery-800 mb-2">
                  {getContent('home_content', 'sign_in_prompt', t('home.signInPrompt'))}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild size="sm">
                    <Link href="/login">
                      {t('navigation.signIn')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/register">
                      {t('navigation.signUp')}
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
            refreshKey={calendarRefreshKey}
          />
        </Container>
      </section>

      {/* Information Section */}
      <section className="py-12 bg-gradient-to-r from-monastery-50 to-lotus-100">
        <Container size="lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-monastery-800 mb-4">
              {getContent('home_content', 'about_title', t('home.aboutTitle'))}
            </h2>
            <p className="text-monastery-700 max-w-3xl mx-auto leading-relaxed">
              {getContent('home_content', 'about_description', t('home.aboutDescription'))}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">🙏</div>
              <h3 className="font-semibold text-monastery-800 mb-2">{getContent('features', 'book_ceremony_title', t('home.bookCeremony'))}</h3>
              <p className="text-sm text-monastery-600">
                {getContent('features', 'book_ceremony_desc', t('home.bookCeremonyDesc'))}
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">🍚</div>
              <h3 className="font-semibold text-monastery-800 mb-2">{getContent('features', 'prepare_offerings_title', t('home.prepareOfferings'))}</h3>
              <p className="text-sm text-monastery-600">
                {getContent('features', 'prepare_offerings_desc', t('home.prepareOfferingsDesc'))}
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl shadow-soft border border-monastery-100">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold text-monastery-800 mb-2">{getContent('features', 'earn_merit_title', t('home.earnMerit'))}</h3>
              <p className="text-sm text-monastery-600">
                {getContent('features', 'earn_merit_desc', t('home.earnMeritDesc'))}
              </p>
            </div>
          </div>

          {user && (
            <div className="text-center mt-8">
              <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600">
                <Link href="/my-account">
                  {t('home.viewMyAccount')}
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
          onAvailabilityChange={handleAvailabilityChange}
        />
      )}
    </div>
  )
}