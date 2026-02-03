# SnowPro Core Quiz

Practice quiz application for the Snowflake SnowPro Core (COF-C02) certification exam.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS 4
- **Database**: SQLite + Drizzle ORM
- **Validation**: Zod
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed the database with questions
npm run db:seed

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

### Development

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build (runs checks first)
npm run start        # Start production server
npm run preview      # Alias for start
```

### Code Quality

```bash
npm run check        # Run all checks (typecheck + lint + format)
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint with zero warnings policy
npm run lint:fix     # ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check formatting
```

### Database

```bash
npm run db:migrate   # Run Drizzle migrations
npm run db:seed      # Seed database with questions
npm run db:push      # Push schema changes (dev only)
npm run db:studio    # Open Drizzle Studio
```

## Project Structure

```
app/                  # Next.js App Router pages
components/           # React components
  ui/                 # Base UI components
  quiz/               # Quiz-specific components
  stats/              # Statistics components
lib/
  db/                 # Database (Drizzle schema, queries)
  actions/            # Server Actions
data/
  quiz.db             # SQLite database
  questions.json      # Question data source
scripts/
  seed.ts             # Database seeding script
types/                # TypeScript type definitions
```

## Quiz Features

- **Practice Mode**: Configurable question count (10/25/50/100), immediate feedback, domain filtering
- **Exam Simulation**: 100 questions, 115-minute timer, deferred feedback, 75% passing threshold

## Exam Domains

| Domain | Topic | Weight |
|--------|-------|--------|
| 1 | Snowflake AI Data Cloud Features & Architecture | 25-30% |
| 2 | Account Access & Security | 20-25% |
| 3 | Performance Concepts | 10-15% |
| 4 | Data Loading & Unloading | 10-15% |
| 5 | Data Transformations | 20-25% |
| 6 | Data Protection & Sharing | 5-10% |

## License

Private project for personal study use.
