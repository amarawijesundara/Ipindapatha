# JWT Authentication App - Next.js

A full-stack authentication application built with Next.js 14, TypeScript, and PostgreSQL.

  npm run db:generate    # Generate Prisma client
  npm run db:push       # Push schema changes to database  
  npm run db:migrate    # Create and run migrations
  npm run db:studio     # Open Prisma Studio for data management
  npm run db:seed       # Seed database with initial data

admin@example.com SuperAdmin123!
## Features

- **Authentication System**: User registration, login, and JWT token management
- **Protected Routes**: Middleware-based route protection
- **User Dashboard**: Real-time statistics and user management
- **Booking System**: Create and manage bookings with availability checking
- **TypeScript**: Full type safety across the application
- **PostgreSQL**: Robust database with proper indexing and triggers
- **Tailwind CSS**: Modern, responsive styling

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Tailwind CSS
- **Password Security**: bcrypt

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd jwt-auth-nextjs-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your database credentials and JWT secret:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=auth_app
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. Set up the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables:

- **users**: User accounts with authentication and profile information
- **bookings**: User bookings with date, time, and status
- **booking_availability**: Available time slots for bookings
- **refresh_tokens**: JWT refresh token management (future use)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - User logout

### Bookings
- `GET /api/bookings` - Get user bookings (protected)
- `POST /api/bookings` - Create new booking (protected)
- `GET /api/bookings/availability` - Get available time slots

### Statistics
- `GET /api/stats` - Get dashboard statistics (protected)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Register page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/            # Reusable React components
├── lib/                  # Utility functions and services
├── middleware.ts         # Next.js middleware
└── types/               # TypeScript type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data

### Default Admin Account

After running the seed script, a default super admin account is created:
- **Email**: admin@example.com
- **Password**: SuperAdmin123!

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt (cost factor: 12)
- Protected API routes with middleware
- Input validation and sanitization
- CORS configuration
- Rate limiting ready (configurable)

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set up production environment variables

3. Deploy to your preferred platform (Vercel, Railway, DigitalOcean, etc.)

4. Run database migrations in production:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.