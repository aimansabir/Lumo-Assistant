This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Admin Panel (single user)

This project includes a simple single-admin authentication for `/admin` that uses credentials stored in environment variables. Add the following to your `.env.local` (or your hosting environment variables):

```
ADMIN_ID=admin
ADMIN_PASSWORD=changeme
ADMIN_JWT_SECRET=a-long-random-secret-string
```

- `ADMIN_ID` and `ADMIN_PASSWORD`: the credentials for the admin UI.
- `ADMIN_JWT_SECRET`: a secret used to sign a token. Keep this safe and long.

During local development, the cookie used by this auth will not use the `Secure` attribute; in production the cookie will be marked Secure and sent only over HTTPS.

Notes on creating subjects from the Admin UI:
- Subject names must be Title Case — each word starts with a capital letter (e.g., "Computer Science"). Submissions that are not Title Case will be rejected.
- Only O Level or A Level are supported. Choose the level when creating the subject.
- The internal workspace handle will be generated on the backend in the form: `lumo_{subject-with-hyphens}_{LEVEL}` — e.g., `lumo_computer-science_O`.

## Confirm modals

This project uses a shared `ConfirmModal` component for destructive actions like logging out, deleting chat sessions or deleting subjects. You can use it like this:

```tsx
import ConfirmModal from '@/app/components/ConfirmModal'

<ConfirmModal
	open={confirmOpen}
	title="Delete"
	description="Are you sure you want to delete this?"
	confirmLabel="Delete"
	danger
	requireTypedConfirmation
	requiredText={displayName}
	onCancel={() => setConfirmOpen(false)}
	onConfirm={async () => {
		await performDelete()
		setConfirmOpen(false)
	}}
/>
```

The modal supports: typed confirmation (use `requireTypedConfirmation` and `requiredText`), a danger style, loading state via the `onConfirm` and `loading` props, and customizable labels.
