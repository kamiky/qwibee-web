# Translation System

## Overview

We've implemented an automated translation system that uses JSON files for translations and automatically generates translated pages. This ensures all pages stay in sync without manual duplication.

## Structure

### Translation Files

All translations are stored in JSON files in the `src/i18n/` directory:

- `src/i18n/en.json` - English translations (source language)
- `src/i18n/fr.json` - French translations

### Translation Utility

The `src/i18n/translations.ts` file exports:

- `translations` object with all translation data
- `useTranslations(lang)` function to get translations for a language
- Type definitions for TypeScript support

## Usage in Pages

### 1. Import translations

```typescript
import { useTranslations } from "@/i18n/translations";

const lang = "en"; // or "fr"
const t = useTranslations(lang);
```

### 2. Use translation keys

```astro
<h1>{t.contact.title}</h1>
<p>{t.contact.subtitle}</p>
```

### 3. Pass translations to scripts

For client-side scripts, use `define:vars`:

```astro
<script define:vars={{ t }}>
  const translations = t.contact;
  buttonText.textContent = translations.form.submit;
</script>
```

## Automatic Page Generation

### The Script

Run `npm run translate` to automatically:

1. Copy all `.astro` pages from `src/pages/` to `src/pages/fr/`
2. Convert `lang = "en"` to `lang = "fr"`
3. Convert relative imports to `@/` alias imports
4. Skip `api/`, `play/`, `apps/`, and `fr/` folders

### Workflow

1. **Edit English pages** in `src/pages/` (not in `src/pages/fr/`)
2. **Use translation keys** from `en.json` instead of hardcoded text
3. **Run `npm run translate`** to regenerate French pages
4. **Commit both** English and French pages

## Adding New Translations

### 1. Add to JSON files

Edit both `src/i18n/en.json` and `src/i18n/fr.json`:

```json
{
  "newSection": {
    "title": "New Title",
    "description": "New Description"
  }
}
```

### 2. Use in pages

```astro
<h2>{t.newSection.title}</h2>
<p>{t.newSection.description}</p>
```

### 3. Regenerate French pages

```bash
npm run translate
```

## Best Practices

### ✅ DO

- Always edit English pages first (`src/pages/*.astro`)
- Use `@/` alias for all imports
- Use translation keys for all user-facing text
- Run `npm run translate` after editing English pages
- Add new translations to both `en.json` and `fr.json`

### ❌ DON'T

- Don't edit files in `src/pages/fr/` directly (they're auto-generated)
- Don't use relative imports like `../components/` (use `@/components/`)
- Don't hardcode text strings in pages (use translation keys)
- Don't forget to translate new keys in `fr.json`

## File Organization

```
src/
├── i18n/
│   ├── en.json           # English translations
│   ├── fr.json           # French translations
│   └── translations.ts   # Translation utility
├── pages/
│   ├── index.astro       # English homepage (SOURCE)
│   ├── contact.astro     # English contact (SOURCE)
│   └── fr/
│       ├── index.astro   # French homepage (AUTO-GENERATED)
│       └── contact.astro # French contact (AUTO-GENERATED)
└── ...
```

## Adding a New Language

To add a new language (e.g., Spanish):

1. Create `src/i18n/es.json` with translations
2. Update `src/i18n/translations.ts`:

   ```typescript
   import esTranslations from "./es.json";

   export const translations = {
     en: enTranslations,
     fr: frTranslations,
     es: esTranslations, // Add this
   } as const;
   ```

3. Modify `scripts/generate-translations.js` to generate `es/` folder
4. Update `LanguageSwitcher.astro` to include Spanish option

## Troubleshooting

### Pages not using translations?

Check that:

1. You imported `useTranslations` from `@/i18n/translations`
2. You're calling `const t = useTranslations(lang)`
3. The translation key exists in both `en.json` and `fr.json`

### French pages not updated?

Run `npm run translate` to regenerate them.

### Import errors?

Make sure you're using the `@/` alias consistently:

- ✅ `import Layout from "@/layouts/Layout.astro"`
- ❌ `import Layout from "../layouts/Layout.astro"`

## Benefits

1. **Single source of truth**: Edit English pages once
2. **Automatic synchronization**: French pages stay in sync
3. **Type safety**: TypeScript knows all translation keys
4. **Maintainable**: Easy to add new languages
5. **Consistent imports**: All pages use `@/` alias
6. **No duplication**: DRY principle for pages and translations
