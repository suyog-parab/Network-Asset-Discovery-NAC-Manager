import { useState } from "react";
import {
  useListDiscoveryJobs, useListDiscoverySources, useCreateDiscoveryJob,
  useCreateDiscoverySource, useUpdateDiscoverySource, useDeleteDiscoverySource
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Play, MoreVertical, Pencil, Trash2, TestTube2, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

const SOURCE_TYPES = ["snmp", "dhcp_isc", "dhcp_windows", "dns", "ad"];
const SNMP_VERSIONS = ["v2c", "v3"];

interface SourceForm {
  name: string; type: string; host: string; port: string;
  username: string; password: string; community: string;
  snmpVersion: string; baseDn: string; enabled: boolean;
}
const EMPTY_SOURCE: SourceForm = {
  name: "", type: "snmp", host: "", port: "", username: "", password: "",
  community: "public", snmpVersion: "v2c", baseDn: "", enabled: true,
};

const JOB_STATUS_ICON = {
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  running: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
};

export default function Discovery() {
  const { data: jobs, isLoading: jobsLoading } = useListDiscoveryJobs();
  const { data: sources, isLoading: sourcesLoading } = useListDiscoverySources();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SourceForm>(EMPTY_SOURCE);
  const [testingId, setTestingId] = useState<number | null>(null);

  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["/api/discovery/jobs"] });
  const invalidateSources = () => queryClient.invalidateQueries({ queryKey: ["/api/discovery/sources"] });

  const createJobMut = useCreateDiscoveryJob({
    mutation: {
      onSuccess: (job) => {
        toast({ title: `Discovery job #${job.id} started`, description: `Source: ${job.sourceName || 'auto-detect'}` });
        invalidateJobs();
      },
      onError: () => toast({ title: "Failed to start discovery job", variant: "destructive" }),
    }
  });

  const createSourceMut = useCreateDiscoverySource({ mutation: { onSuccess: () => { toast({ title: "Source added" }); invalidateSources(); setDialogOpen(false); } } });
  const updateSourceMut = useUpdateDiscoverySource({ mutation: { onSuccess: () => { toast({ title: "Source updated" }); invalidateSources(); setDialogOpen(false); } } });
  const deleteSourceMut = useDeleteDiscoverySource({ mutation: { onSuccess: () => { toast({ title: "Source removed" }); invalidateSources(); setDeleteId(null); } } });

  const openCreate = () => { setForm(EMPTY_SOURCE); setEditingId(null); setDialogOpen(true); };
  const openEdit = (s: NonNullable<typeof sources>[0]) => {
    const sx = s as any;
    setForm({
      name: s.name, type: s.type, host: s.host ?? "",
      port: s.port ? String(s.port) : "",
      username: sx.username ?? "", password: "",
      community: sx.community ?? "public",
      snmpVersion: sx.snmpVersion ?? "v2c",
      baseDn: sx.baseDn ?? "",
      enabled: s.enabled ?? true,
    });
    setEditingId(s.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      name: form.name, type: form.type, host: form.host,
      port: form.port ? parseInt(form.port) : undefined,
      username: form.username || undefined,
      password: form.password || undefined,
      community: form.community || undefined,
      snmpVersion: form.snmpVersion,
      baseDn: form.baseDn || undefined,
      enabled: form.enabled,
    };
    if (editingId) updateSourceMut.mutate({ id: editingId, data: payload as any });
    else createSourceMut.mutate({ data: payload as any });
  };

  const testConnection = async (sourceId: number) => {
    setTestingId(sourceId);
    try {
      const resp = await fetch(`/api/discovery/sources/${sourceId}/test`, { method: "POST" });
      const result = await resp.json();
      if (result.success) {
        toast({ title: `Connection successful (${result.latencyMs}ms)`, description: result.serverInfo });
      } else {
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      }
      invalidateSources();
    } catch {
      toast({ title: "Test request failed", variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const runJob = (sourceId?: number) => {
    createJobMut.mutate({ data: { type: "snmp", sourceId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discovery</h1>
          <p className="text-muted-foreground text-sm mt-1">SNMP, DHCP, DNS, and Active Directory network discovery</p>
        </div>
        <Button onClick={() => runJob()} disabled={createJobMut.isPending}>
          <Play className="mr-2 h-4 w-4" />
          {createJobMut.isPending ? "Starting..." : "Run Discovery"}
        </Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
          <TabsTrigger value="sources">Sources ({sources?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Discovery Jobs</CardTitle>
              <Button variant="outline" size="sm" onClick={invalidateJobs}><RefreshCw className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Found</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : jobs && jobs.length > 0 ? (
                    jobs.map(job => {
                      const durationMs = job.completedAt && job.startedAt
                        ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
                        : null;
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-xs">{job.id}</TableCell>
                          <TableCell className="text-sm">{job.sourceName || <span className="text-muted-foreground">auto</span>}</TableCell>
                          <TableCell><Badge variant="outline" className="uppercase text-xs">{job.type}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {JOB_STATUS_ICON[job.status as keyof typeof JOB_STATUS_ICON] || null}
                              <span className="text-sm capitalize">{job.status}</span>
                            </div>
                            {job.errorMessage && <p className="text-xs text-destructive mt-0.5 max-w-[200px] truncate">{job.errorMessage}</p>}
                          </TableCell>
                          <TableCell>{job.devicesFound ?? '-'}</TableCell>
                          <TableCell className="text-green-500 font-medium">{job.devicesNew ? `+${job.devicesNew}` : '-'}</TableCell>
                          <TableCell>{job.devicesUpdated ?? '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No jobs yet. Click "Run Discovery" to start.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discovery Sources</CardTitle>
                <CardDescription>Configure SNMP switches, DHCP servers, DNS, and Active Directory.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Source</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourcesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : sources && sources.length > 0 ? (
                    sources.map(source => (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell><Badge variant="outline" className="uppercase text-xs">{source.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{source.host}</TableCell>
                        <TableCell>
                          {source.lastRunStatus === "success" ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">OK</Badge>
                          ) : source.lastRunStatus === "failed" ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : (
                            <Badge variant="secondary">Never run</Badge>
                          )}
                          {(source as any).lastError && <p className="text-xs text-destructive mt-0.5 max-w-[140px] truncate">{(source as any).lastError}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {source.lastRunAt ? new Date(source.lastRunAt).toLocaleString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={source.enabled}
                            onCheckedChange={(v) => updateSourceMut.mutate({ id: source.id, data: { enabled: v } as any })}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => runJob(source.id)} disabled={createJobMut.isPending}>
                                <Play className="h-4 w-4 mr-2" /> Run Job
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => testConnection(source.id)} disabled={testingId === source.id}>
                                <TestTube2 className="h-4 w-4 mr-2" /> {testingId === source.id ? "Testing..." : "Test Connection"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(source)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(source.id)}><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No sources configured. Add a source to start discovery.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Source" : "Add Discovery Source"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Core Switch SNMP" />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host / IP *</Label>
                <Input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="192.168.1.1" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder={form.type === "snmp" ? "161" : form.type === "dns" ? "53" : "22"} />
              </div>
            </div>

            {form.type === "snmp" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SNMP Version</Label>
                  <Select value={form.snmpVersion} onValueChange={v => setForm(f => ({ ...f, snmpVersion: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SNMP_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Community String</Label>
                  <Input value={form.community} onChange={e => setForm(f => ({ ...f, community: e.target.value }))} placeholder="public" />
                </div>
              </div>
            )}

            {(form.type === "dhcp_isc" || form.type === "dhcp_windows" || form.type === "ad") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder={form.type === "ad" ? "cn=svc-nac,dc=corp,dc=local" : "root"} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
            )}

            {form.type === "ad" && (
              <div className="space-y-2">
                <Label>Base DN</Label>
                <Input value={form.baseDn} onChange={e => setForm(f => ({ ...f, baseDn: e.target.value }))} placeholder="DC=corp,DC=local" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.host || createSourceMut.isPending || updateSourceMut.isPending}>
              {editingId ? "Save Changes" : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Source?</AlertDialogTitle><AlertDialogDescription>All associated jobs will remain but no new jobs can be triggered.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteSourceMut.mutate({ id: deleteId })}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
