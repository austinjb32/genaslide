# GenASlide

> 🚀 AI-powered slide generator for modern presentations

GenASlide is my iconic hobby project: a Next.js app that turns a topic into a complete slide deck with AI-generated content, images, and export features. It delivers a polished UX and production-ready export paths (PowerPoint, PDF, Google Slides). 

---

## 🎯 Why this project

- Built with Next.js 16 + App Router
- NextAuth v5 for auth flows
- PostgreSQL + Prisma for persistence
- OpenRouter + Replicate
- Real-time premade templates and slideshow UI

### Key user flows

1. Generate slides via OpenRouter prompt
2. Pick AI background images (Replicate)
3. View interactive slideshow with animations
4. Export to PPTX / PDF

---

## 🧩 Features

- User auth, sign up, login, password management
- AI slide generation (titles, content, layout) in `/app/api/slides/route.ts`
- AI background image generation in `/app/api/images/route.ts`
- Presentation store, edit, and retrieve at `/app/api/presentations/route.ts`
- PPTX/PDF download in `/app/api/download/route.ts`
- Responsive UI with Tailwind v4
- Swiper-based slide preview (`app/components/Slideshow.tsx`)

---

## 📁 Important files

- `app/dashboard/page.tsx` – main generation & editing interface
- `app/components/Slideshow.tsx` – slideshow + pagination + nav behavior
- `app/globals.css` – theme + swiper custom styles
- `lib/download.ts` – PPTX/PDF builder
- `prisma/schema.prisma` – DB entities 
- `auth.ts`, `app/api/auth/[...nextauth]/route.ts` – auth config

---

## ⚙️ Setup

1. Clone repo:

```bash
git clone https://github.com/austinjb32/genaslide.git
cd genaslide
```

2. Install:

```bash
npm install
```

3. Create `.env` using `.env.example` values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL=http://localhost:3000`
- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

4. Database migrate:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Start app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Test & development tasks

- `npm run lint` for ESLint
- `npm run build` for production build
- Add new slide themes in `getLayoutClasses` inside `app/components/Slideshow.tsx`

---

## 🎨 Your custom style notes

- Slideshow navigation bullets + arrows are controlled in `app/globals.css`
- Current fix:
  - `.swiper-pagination-bullet-active` reduced to 12px
  - `.swiper-button-prev/.next` set to 32px + centered icon
  - `overflow: hidden` ensures the chevron remains inside circle

---

## 🏆 What makes this iconic

- Combines cutting-edge AI APIs with UX-first animation
- Fully end-to-end content + media generation + slides export
- Great demo for portfolio, show “real production delivery on AI imagery + automation”
- Clean architecture with auth, persistence, background jobs, export formats

---

## 🙌 Credits

- [Next.js](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Swiper](https://swiperjs.com)
- [Prisma](https://prisma.io)
- [OpenRouter](https://openrouter.ai)
- [Replicate](https://replicate.com)
- [Google Slides API](https://developers.google.com/slides)

---

## 📬 Want to contribute?

1. Fork
2. Create feature branch
3. PR with details of the AI model and export additions
4. Include screenshots showing the slide/NLP output flow

---

## 📝 License

MIT

