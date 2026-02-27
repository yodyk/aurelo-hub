import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSearchParams } from 'react-router';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '@/data/ThemeContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import BillingTabComponent from '@/components/BillingTab';

/* ── Section wrapper ── */
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-border pb-1 mb-5">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-5">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('My Workspace');
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <section className="pt-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground/70 mb-3">Settings</p>
        <p className="text-2xl font-semibold tracking-tight text-foreground">My Workspace</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10">
        {/* Left column */}
        <div className="space-y-10">
          <Section title="Workspace">
            <div className="space-y-1.5">
              <Label className="text-sm">Workspace name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Website URL</Label>
              <Input placeholder="https://yoursite.com" />
            </div>
            <Button size="sm" className="h-9">Save changes</Button>
          </Section>

          <Section title="Financial Defaults" defaultOpen={false}>
            <p className="text-[11px] text-muted-foreground -mt-2">These defaults apply to new clients and revenue calculations.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Internal cost rate ($/hr)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tax rate (%)</Label>
                <Input type="number" defaultValue="25" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">Processing fee (%)</Label>
                <Input type="number" defaultValue="2.9" className="max-w-[50%]" />
              </div>
            </div>
            <Button size="sm" className="h-9">Save changes</Button>
          </Section>

          <Section title="Billing">
            <BillingTabComponent />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-10">
          <Section title="Appearance">
            <div className="flex gap-2">
              {[
                { value: 'light' as const, icon: Sun, label: 'Light' },
                { value: 'dark' as const, icon: Moon, label: 'Dark' },
                { value: 'system' as const, icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[4px] border text-sm transition-colors duration-150 ${
                    theme === value
                      ? 'border-foreground text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Team">
            <p className="text-sm text-muted-foreground">Team management will be available when backend is connected.</p>
          </Section>

          <Section title="Integrations" defaultOpen={false}>
            <p className="text-sm text-muted-foreground">Integrations will be available when backend is connected.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
