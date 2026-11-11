import { useCallback, useEffect, useState } from 'react';
import { Coins, Loader as Loader2, QrCode, ScrollText, Settings2, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { ApprovalsPanel } from '@/components/admin/ApprovalsPanel';
import { PlayersPanel } from '@/components/admin/PlayersPanel';
import { QrCodesPanel } from '@/components/admin/QrCodesPanel';
import { SystemLogsPanel } from '@/components/admin/SystemLogsPanel';
import { TableSettingsPanel } from '@/components/admin/TableSettingsPanel';
import { useLiveData } from '@/hooks/useLiveData';
import { fetchAllTransactions, fetchIsAdmin } from '@/lib/api';
import type { TransactionRow } from '@/lib/models';

type AdminTab = 'approvals' | 'players' | 'settings' | 'qr' | 'logs';

const TABS: { id: AdminTab; label: string; icon: typeof Coins }[] = [
  { id: 'approvals', label: 'Approvals', icon: Coins },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'settings', label: 'Table settings', icon: Settings2 },
  { id: 'qr', label: 'Payment QR', icon: QrCode },
  { id: 'logs', label: 'System logs', icon: ScrollText },
];

export function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void fetchIsAdmin()
      .then((value) => active && setIsAdmin(value))
      .catch(() => active && setIsAdmin(false));
    return () => {
      active = false;
    };
  }, []);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">Admins only</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your account does not have admin access. Ask the room owner to give your account the admin role.
          </p>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('approvals');
  const load = useCallback(() => fetchAllTransactions(), []);
  const transactions = useLiveData<TransactionRow[]>(load, ['transactions', 'players'], []);
  const pendingCount = transactions.data.filter((tx) => tx.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-gold-300" /> Admin control panel
          </h1>
          <p className="text-sm text-slate-400">Every change here is logged and visible to players where it applies.</p>
        </div>
      </div>

      <nav role="tablist" aria-label="Admin sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active ? 'btn-gold shadow' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === 'approvals' && pendingCount > 0 && (
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <section key={tab} className="animate-fade-in">
        {tab === 'approvals' && (
          <ApprovalsPanel
            transactions={transactions.data}
            error={transactions.error}
            onChanged={transactions.refresh}
          />
        )}
        {tab === 'players' && <PlayersPanel />}
        {tab === 'settings' && <TableSettingsPanel />}
        {tab === 'qr' && <QrCodesPanel />}
        {tab === 'logs' && <SystemLogsPanel />}
      </section>
    </div>
  );
}
