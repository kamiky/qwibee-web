# watchmefans Web

A beautiful showcase website for small applications, built with Astro, React, Tailwind CSS, and Vite.

## Features

- 🌐 Multilingual support (English/French)
- 🎨 Dark coding theme with blue/purple gradients
- ⚡️ Fast and optimized with Astro
- 🎭 Smooth animations and transitions
- 📱 Fully responsive design

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm preview
```

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── AppCard.tsx
│   ├── data/
│   │   └── apps.ts
│   ├── i18n/
│   │   └── translations.ts
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       └── fr/
│           └── index.astro
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Adding New Apps

Edit `src/data/apps.ts` to add new applications to the showcase.

## Tech Stack

- [Astro](https://astro.build) - Web framework
- [React](https://react.dev) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org) - Type safety
