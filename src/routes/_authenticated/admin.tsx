import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '@/views/AdminPage';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({
    meta: [
      { title: 'Admin Control Panel · Master Poker' },
      { name: 'description', content: 'Approve cash-ins and withdrawals, manage players, table settings and payment QR codes.' },
      { property: 'og:title', content: 'Admin Control Panel · Master Poker' },
      { property: 'og:description', content: 'Manage wallet approvals, players and table settings.' },
    ],
  }),
  component: AdminPage,
});
