import { useState, useMemo } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const sampleProjects = [
  { id: '1', client: 'Arcadia Design', name: 'Brand Refresh 2025', status: 'active', totalValue: 15000, estimatedHours: 100, startDate: '2025-01-15' },
  { id: '2', client: 'Meridian Labs', name: 'Dashboard Redesign', status: 'active', totalValue: 8500, estimatedHours: 60, startDate: '2025-02-01' },
  { id: '3', client: 'Beacon Studio', name: 'Marketing Site', status: 'planned', totalValue: 12000, estimatedHours: 80, startDate: null },
  { id: '4', client: 'Arcadia Design', name: 'App Icons', status: 'completed', totalValue: 3000, estimatedHours: 20, startDate: '2024-11-01' },
];

const statusColor = (s: string) => {
  switch (s) {
    case 'active': return 'default';
    case 'completed': return 'default';
    case 'cancelled': return 'destructive';
    default: return 'secondary';
  }
};

export default function Projects() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sampleProjects.find(p => p.id === selectedId);

  const activeProjects = sampleProjects.filter(p => p.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-xl">Projects</h1>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project list */}
        <div className="lg:col-span-1 space-y-2">
          {activeProjects.map(p => (
            <div
              key={p.id}
              className={`card-flat p-4 cursor-pointer transition-default ${selectedId === p.id ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setSelectedId(p.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-heading-md truncate">{p.name}</h3>
                <Badge variant={statusColor(p.status) as any} className="capitalize text-[10px]">{p.status}</Badge>
              </div>
              <p className="type-caption fg-tertiary">{p.client}</p>
              <p className="text-sm font-medium mt-2">${p.totalValue.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Project detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card-flat p-6 space-y-6">
              <div>
                <p className="type-caption fg-tertiary">{selected.client}</p>
                <h2 className="type-title mt-1">{selected.name}</h2>
              </div>
              <div className="flex items-center gap-8 pt-2 border-t border-border/20">
                <div>
                  <p className="type-caption fg-tertiary">Total value</p>
                  <p className="type-heading mt-0.5">${selected.totalValue.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border/20" />
                <div>
                  <p className="type-caption fg-tertiary">Est. hours</p>
                  <p className="type-heading mt-0.5">{selected.estimatedHours}h</p>
                </div>
                <div className="w-px h-8 bg-border/20" />
                <div>
                  <p className="type-caption fg-tertiary">Status</p>
                  <Badge variant={statusColor(selected.status) as any} className="capitalize mt-0.5">{selected.status}</Badge>
                </div>
              </div>
              <div>
                <p className="type-caption fg-tertiary mb-3">Milestones</p>
                <p className="text-sm text-muted-foreground">No milestones yet. Connect to backend to manage milestones.</p>
              </div>
            </div>
          ) : (
            <div className="card-flat p-8 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a project to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
