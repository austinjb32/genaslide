<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GenaSlide - AI-Powered Presentation Generator

## Tech Stack
- Next.js 16 (App Router)
- NextAuth v5 (Auth.js beta)
- Tailwind CSS v4
- PostgreSQL with Prisma ORM
- OpenRouter API (gpt-oss-model) - slide content generation
- Replicate API (flux-schnell) - background image generation

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

## Environment Variables
- `AUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL (default: http://localhost:3000)
- `DATABASE_URL` - PostgreSQL connection string
- `OPENROUTER_API_KEY` - OpenRouter API key for AI slide generation
- `REPLICATE_API_TOKEN` - Replicate API token for AI image generation

## Key Files
- `auth.ts` - NextAuth configuration
- `prisma/schema.prisma` - Database schema
- `lib/download.ts` - PPTX and PDF generation utilities
- `app/api/auth/[...nextauth]/route.ts` - Auth API routes
- `app/api/slides/route.ts` - Slide generation API
- `app/api/images/route.ts` - Image generation API
- `app/api/download/route.ts` - PPTX/PDF download API
- `app/dashboard/page.tsx` - Main app interface
- `app/(auth)/login/page.tsx` - Login page
- `app/(auth)/signup/page.tsx` - Signup page

## Database Setup
- PostgreSQL database with Prisma ORM
- Run `npx prisma migrate dev` to create tables
- Run `npx prisma generate` to regenerate client
