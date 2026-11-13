// apps/web/src/app/admin/audit/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch, ApiError } from '@/lib/api';
import {
  ClipboardList,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  Calendar,
  Building2,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  hotel_id?: string;
  actor_id?: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_state?: string;
  new_state?: string;
  ip_address?: string;
  created_at: string;
  hotel?: {
    name: string;
    slug: string;
  };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AuditLogEntry[]>('/admin/audit-logs');
      setLogs(data);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex min-h-screen bg-canvas-neutral">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-charcoal-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-normal text-charcoal-900 leading-tight">System Audit Log</h1>
            <Badge variant="primary" className="text-[11px] font-normal">
              Immutable Security Journal
            </Badge>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs font-normal">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-normal">
              {error}
            </div>
          )}

          <Card className="p-5 bg-white border-charcoal-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Security & Administrative Audit Trail</CardTitle>
                <CardDescription>
                  Real-time immutable logging of property suspensions, room allocations, check-ins, check-outs, and inspection approvals
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-charcoal-500">
                {logs.length} journal records captured
              </span>
            </div>

            {loading ? (
              <div className="h-48 rounded-xl bg-canvas-neutral animate-pulse flex items-center justify-center text-xs text-charcoal-400">
                Loading Audit Journal...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-charcoal-500 text-xs">
                No audit log entries found.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-charcoal-200 bg-canvas-neutral hover:bg-white hover:border-neutral-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" className="font-mono text-[10px] font-normal">
                          {log.action}
                        </Badge>
                        <span className="font-normal text-charcoal-900 font-mono">
                          {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(-6)})` : ''}
                        </span>
                        {log.hotel && (
                          <Badge variant="neutral" className="text-[10px] font-normal">
                            {log.hotel.name}
                          </Badge>
                        )}
                      </div>

                      <div className="text-charcoal-600 font-normal">
                        {log.new_state || 'Action executed'}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between text-right text-charcoal-500 font-mono text-[11px] shrink-0 font-normal">
                      <span>{log.actor_role}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
