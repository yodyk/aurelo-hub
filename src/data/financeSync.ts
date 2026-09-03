import { supabase } from '@/integrations/supabase/client';
import { syncIncomeSources, loadFinanceSettings } from './financeApi';

const db = supabase as any;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function resolveWorkspaceId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from('workspace_members').select('workspace_id').eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle();
  return data?.workspace_id || null;
}

/** Re-sync source-owned income fields from the live projects/invoices/clients. User overrides, notes and inclusion are never touched. */
export async function runIncomeSync(workspaceId: string): Promise<void> {
  const [settings, clientRes, projectRes, invoiceRes] = await Promise.all([
    loadFinanceSettings(workspaceId),
    db.from('clients').select('id,name,status,billing_model,monthly_contract_value,retainer_cycle_start,retainer_cycle_days').eq('workspace_id', workspaceId),
    db.from('projects').select('id,client_id,name,status,contract_value,total_value,start_date').eq('workspace_id', workspaceId),
    db.from('invoices').select('id,client_id,project_id,number,total,status,issued_date,paid_date,currency,client_name').eq('workspace_id', workspaceId),
  ]);
  const clients = (clientRes.data || []).map((r: any) => ({ id: r.id, name: r.name, status: r.status, billingModel: r.billing_model, monthlyContractValue: r.monthly_contract_value, retainerCycleStart: r.retainer_cycle_start, retainerCycleDays: r.retainer_cycle_days }));
  const projects = (projectRes.data || []).map((r: any) => ({ id: r.id, clientId: r.client_id, name: r.name, status: r.status, contractValue: r.contract_value, totalValue: r.total_value, startDate: r.start_date }));
  const invoices = (invoiceRes.data || []).map((r: any) => ({ id: r.id, clientId: r.client_id, projectId: r.project_id, number: r.number, total: Number(r.total) || 0, status: r.status, issuedDate: r.issued_date, paidDate: r.paid_date, currency: r.currency, clientName: r.client_name }));
  await syncIncomeSources(workspaceId, clients, projects, invoices, settings.currency || 'USD');
}

/** Fire-and-forget debounced sync used by invoice/project/client mutations. */
export function scheduleIncomeSync(workspaceId?: string | null): void {
  const run = async () => {
    const id = workspaceId || (await resolveWorkspaceId());
    if (!id) return;
    try {
      await runIncomeSync(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finance-income-sync', { detail: { workspaceId: id } }));
      }
    } catch (error) {
      console.warn('[financeSync] income sync failed', error);
    }
  };
  const key = workspaceId || '__self__';
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => { timers.delete(key); void run(); }, 600));
}
