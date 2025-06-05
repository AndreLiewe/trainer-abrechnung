Trainer-Abrechnung ist eine Webanwendung zur Verwaltung von Abrechnungen für Trainer. Das Projekt basiert auf [Next.js](https://nextjs.org) und wurde mit [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) gestartet.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Bestätigungsdialog verwenden

Für Lösch- oder Reset-Aktionen steht ein wiederverwendbarer Bestätigungsdialog zur Verfügung. Dazu muss der globale Layout-Wrapper mit `ConfirmProvider` versehen werden:

```tsx
import { ConfirmProvider } from "@/components/ConfirmDialog";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
    </ConfirmProvider>
  );
}
```

Innerhalb von Client-Komponenten kannst du anschließend `useConfirm` aufrufen und auf die Bestätigung warten:

```tsx
import { useConfirm } from "@/components/ConfirmDialog";

async function handleDelete() {
  const ok = await useConfirm({ message: "Eintrag wirklich löschen?" });
  if (ok) {
    // ... Supabase-Operation ausführen
  }
}
```
