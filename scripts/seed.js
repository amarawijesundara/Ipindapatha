const { Pool } = require('pg')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'auth_app',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function seed() {
  try {
    console.log('Starting database seeding...')
    
    // Check if super admin exists
    const existingAdminResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      ['admin@example.com', 'super_admin']
    )

    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12)

    if (existingAdminResult.rows.length === 0) {
      const adminResult = await pool.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['super_admin', 'admin@example.com', hashedPassword, 'super_admin'])
      
      console.log('Default super admin created: admin@example.com / SuperAdmin123!')
    } else {
      // Update existing super admin password
      await pool.query(`
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP
        WHERE email = $2 AND role = $3
      `, [hashedPassword, 'admin@example.com', 'super_admin'])
      
      console.log('Super admin password updated: admin@example.com / SuperAdmin123!')
    }

    // Check if tenant admin exists
    const existingTenantAdminResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      ['admin@ipindapatha.com', 'tenant_admin']
    )

    const tenantHashedPassword = await bcrypt.hash('TenantAdmin123', 12)

    if (existingTenantAdminResult.rows.length === 0) {
      const tenantAdminResult = await pool.query(`
        INSERT INTO users (username, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['tenant_admin', 'admin@ipindapatha.com', tenantHashedPassword, 'tenant_admin'])
      
      console.log('Default tenant admin created: admin@ipindapatha.com / TenantAdmin123')
    } else {
      // Update existing tenant admin password
      await pool.query(`
        UPDATE users 
        SET password = $1, updated_at = CURRENT_TIMESTAMP
        WHERE email = $2 AND role = $3
      `, [tenantHashedPassword, 'admin@ipindapatha.com', 'tenant_admin'])
      
      console.log('Tenant admin password updated: admin@ipindapatha.com / TenantAdmin123')
    }

    // Get super admin ID for content seeding
    const adminResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      ['admin@example.com', 'super_admin']
    )
    const adminId = adminResult.rows[0].id

    // Seed default content in both English and Sinhala
    const contentData = [
      // English content
      // Site Info
      { content_key: 'site_name', category: 'site_info', language: 'en', title: 'Site Name', content: 'Monastery Dhane Booking', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'site_subtitle', category: 'site_info', language: 'en', title: 'Site Subtitle', content: 'Book your offering ceremony with devotion', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'site_logo_text', category: 'site_info', language: 'en', title: 'Logo Text', content: 'JA', content_type: 'text', display_order: 3, updated_by: adminId },
      
      // Navigation
      { content_key: 'home', category: 'navigation', language: 'en', title: 'Home', content: 'Home', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'my_account', category: 'navigation', language: 'en', title: 'My Account', content: 'My Account', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'admin', category: 'navigation', language: 'en', title: 'Admin', content: 'Admin', content_type: 'text', display_order: 3, updated_by: adminId },
      { content_key: 'sign_in', category: 'navigation', language: 'en', title: 'Sign In', content: 'Sign In', content_type: 'text', display_order: 4, updated_by: adminId },
      { content_key: 'sign_up', category: 'navigation', language: 'en', title: 'Sign Up', content: 'Sign Up', content_type: 'text', display_order: 5, updated_by: adminId },
      { content_key: 'logout', category: 'navigation', language: 'en', title: 'Logout', content: 'Logout', content_type: 'text', display_order: 6, updated_by: adminId },
      
      // Home Content
      { content_key: 'welcome_message', category: 'home_content', language: 'en', title: 'Welcome Message', content: 'Welcome, {{username}}', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'select_date_prompt', category: 'home_content', language: 'en', title: 'Select Date Prompt', content: 'Select a date below to book your Dhane offering ceremony', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'sign_in_prompt', category: 'home_content', language: 'en', title: 'Sign In Prompt', content: 'Please sign in to book your Dhane offering ceremony', content_type: 'text', display_order: 3, updated_by: adminId },
      { content_key: 'about_title', category: 'home_content', language: 'en', title: 'About Title', content: 'About Dhane Offerings', content_type: 'text', display_order: 4, updated_by: adminId },
      { content_key: 'about_description', category: 'home_content', language: 'en', title: 'About Description', content: 'Dhane is a Buddhist practice of offering food and necessities to monks. It\'s a meritorious act that brings spiritual benefits to the devotee and supports the monastic community.', content_type: 'text', display_order: 5, updated_by: adminId },
      
      // Features
      { content_key: 'book_ceremony_title', category: 'features', language: 'en', title: 'Book Ceremony - Title', content: 'Book Your Ceremony', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'book_ceremony_desc', category: 'features', language: 'en', title: 'Book Ceremony - Description', content: 'Select an available date and time for your offering ceremony', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'prepare_offerings_title', category: 'features', language: 'en', title: 'Prepare Offerings - Title', content: 'Prepare Offerings', content_type: 'text', display_order: 3, updated_by: adminId },
      { content_key: 'prepare_offerings_desc', category: 'features', language: 'en', title: 'Prepare Offerings - Description', content: 'Bring rice, curry, fruits, and other necessities for the monks', content_type: 'text', display_order: 4, updated_by: adminId },
      { content_key: 'earn_merit_title', category: 'features', language: 'en', title: 'Earn Merit - Title', content: 'Earn Merit', content_type: 'text', display_order: 5, updated_by: adminId },
      { content_key: 'earn_merit_desc', category: 'features', language: 'en', title: 'Earn Merit - Description', content: 'Gain spiritual merit through your generous offering to the Sangha', content_type: 'text', display_order: 6, updated_by: adminId },
      
      // Sinhala content
      // Site Info
      { content_key: 'site_name', category: 'site_info', language: 'si', title: 'Site Name', content: 'පන්සල් දානේ වෙන්කරවීම්', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'site_subtitle', category: 'site_info', language: 'si', title: 'Site Subtitle', content: 'ඔබේ පූජා උත්සවය භක්තියෙන් වෙන් කරවන්න', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'site_logo_text', category: 'site_info', language: 'si', title: 'Logo Text', content: 'JA', content_type: 'text', display_order: 3, updated_by: adminId },
      
      // Navigation - Sinhala
      { content_key: 'home', category: 'navigation', language: 'si', title: 'Home', content: 'මුල් පිටුව', content_type: 'text', display_order: 1, updated_by: adminId },
      { content_key: 'my_account', category: 'navigation', language: 'si', title: 'My Account', content: 'මගේ ගිණුම', content_type: 'text', display_order: 2, updated_by: adminId },
      { content_key: 'admin', category: 'navigation', language: 'si', title: 'Admin', content: 'පරිපාලක', content_type: 'text', display_order: 3, updated_by: adminId },
      { content_key: 'sign_in', category: 'navigation', language: 'si', title: 'Sign In', content: 'ලොගින්', content_type: 'text', display_order: 4, updated_by: adminId },
      { content_key: 'sign_up', category: 'navigation', language: 'si', title: 'Sign Up', content: 'ගිණුමක් සාදන්න', content_type: 'text', display_order: 5, updated_by: adminId },
      { content_key: 'logout', category: 'navigation', language: 'si', title: 'Logout', content: 'ලොගවුට්', content_type: 'text', display_order: 6, updated_by: adminId }
    ]

    // Check if content already exists
    const existingContentResult = await pool.query('SELECT COUNT(*) FROM site_content')
    const existingContentCount = parseInt(existingContentResult.rows[0].count)

    if (existingContentCount === 0) {
      for (const item of contentData) {
        await pool.query(`
          INSERT INTO site_content (
            content_key, category, language, title, content, 
            content_type, display_order, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (content_key, language) DO NOTHING
        `, [
          item.content_key, item.category, item.language, item.title,
          item.content, item.content_type, item.display_order, item.updated_by
        ])
      }
      console.log('Default site content seeded (English and Sinhala)')
    } else {
      console.log('Site content already exists, skipping content seeding')
    }

    // Seed tenant settings with default meal costs
    const existingTenantSettingsResult = await pool.query('SELECT COUNT(*) FROM tenant_settings')
    const existingTenantSettingsCount = parseInt(existingTenantSettingsResult.rows[0].count)

    if (existingTenantSettingsCount === 0) {
      // Default meal costs based on monastic meal periods
      const defaultMealCosts = {
        morning_meal: 75,
        morning_tea: 25,
        lunch_meal: 100,
        evening_tea: 30
      }

      // Create default tenant settings (assuming tenant_id = 1 for single tenant setup)
      await pool.query(`
        INSERT INTO tenant_settings (tenant_id, meal_costs)
        VALUES ($1, $2)
      `, [1, JSON.stringify(defaultMealCosts)])

      console.log('Default tenant settings with meal costs seeded')
    } else {
      console.log('Tenant settings already exist, skipping seeding')
    }

    // Note: Meal period availability is now generated dynamically by the availability API
    // No need to seed individual time slots - the system will generate meal period availability on demand
    
    console.log('🎉 Database seeding completed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Super Admin: admin@example.com / SuperAdmin123!')
    console.log('- Tenant Admin: admin@ipindapatha.com / TenantAdmin123')
    console.log('- Default meal costs configured:')
    console.log('  🌅 Morning Meal: $75 (6:30-7:30 AM)')
    console.log('  🍵 Morning Tea: $25 (9:30-10:30 AM)')
    console.log('  🍽️ Lunch Meal: $100 (11:30-12:00 PM)')
    console.log('  ☕ Evening Tea: $30 (3:00-4:00 PM)')
    console.log('- Site content (English and Sinhala) configured')
    console.log('- Meal period availability generated dynamically')
    
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  seed()
}

module.exports = { seed }