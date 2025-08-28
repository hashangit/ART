import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

type McpToolDef = { name: string; description?: string };
type McpServerCard = {
  id: string;
  displayName?: string;
  description?: string;
  connection?: { url?: string; authStrategyId?: string };
  enabled?: boolean;
  tools?: McpToolDef[];
};

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadServers: () => Promise<McpServerCard[]>;
  isInstalled: (serverId: string) => Promise<boolean> | boolean;
  onInstall: (card: McpServerCard) => Promise<void>;
  onUninstall?: (serverId: string) => Promise<void>;
  onAddToChat: (card: McpServerCard, toolNames: string[]) => Promise<void>;
}

export const DiscoverModal: React.FC<DiscoverModalProps> = ({ isOpen, onClose, loadServers, isInstalled, onInstall, onUninstall, onAddToChat }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServerCard[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedTools, setSelectedTools] = useState<Record<string, Record<string, boolean>>>({});
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await loadServers();
        setServers(list);
        const imap: Record<string, boolean> = {};
        for (const s of list) {
          const installed = await Promise.resolve(isInstalled(s.id));
          imap[s.id] = !!installed;
        }
        setInstalledMap(imap);
      } catch (e: any) {
        setError(e?.message || 'Failed to load services');
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, loadServers, isInstalled]);

  const allSelected = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const s of servers) {
      const map = selectedTools[s.id] || {};
      result[s.id] = Object.entries(map).filter(([, v]) => v).map(([k]) => k);
    }
    return result;
  }, [servers, selectedTools]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Discover MCP Servers</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {!loading && !error && (
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-3">
                  {servers.map((s) => {
                    const name = s.displayName || s.id;
                    const isAuth = !!s.connection?.authStrategyId;
                    const selected = allSelected[s.id] || [];
                    return (
                      <div key={s.id} className="border rounded-md p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{name}</div>
                              {installedMap[s.id] ? <Badge variant="secondary">Installed</Badge> : null}
                              {isAuth ? <Badge variant="outline">Auth</Badge> : null}
                            </div>
                            {s.description ? (
                              <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
                            ) : null}
                            {s.connection?.url ? (
                              <div className="text-[11px] text-muted-foreground mt-1">{s.connection.url}</div>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))}>
                              {expanded[s.id] ? 'Hide tools' : 'Show tools'}
                            </Button>
                            {installedMap[s.id] ? (
                              <Button size="sm" variant="destructive" onClick={async () => { if (onUninstall) { await onUninstall(s.id); } setInstalledMap((m) => ({ ...m, [s.id]: false })); }}>Uninstall</Button>
                            ) : (
                              <Button size="sm" onClick={async () => { await onInstall(s); setInstalledMap((m) => ({ ...m, [s.id]: true })); }} disabled={installedMap[s.id]}>Install</Button>
                            )}
                            <Button size="sm" variant="default" onClick={async () => { await onAddToChat(s, selected); }}>Add to chat</Button>
                          </div>
                        </div>
                        {expanded[s.id] && (
                          <div className="mt-3 space-y-2">
                            {(s.tools || []).length === 0 ? (
                              <div className="text-xs text-muted-foreground">No tools reported</div>
                            ) : (
                              (s.tools || []).map((t) => (
                                <label key={t.name} className="flex items-start gap-2 text-sm">
                                  <Checkbox checked={!!selectedTools[s.id]?.[t.name]} onCheckedChange={(v) => {
                                    setSelectedTools((prev) => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], [t.name]: !!v },
                                    }));
                                  }} />
                                  <div>
                                    <div className="font-medium">{t.name}</div>
                                    {t.description ? <div className="text-xs text-muted-foreground">{t.description}</div> : null}
                                  </div>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DiscoverModal;




