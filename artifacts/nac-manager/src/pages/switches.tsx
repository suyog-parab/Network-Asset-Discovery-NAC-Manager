import { useState } from "react";
import { useListSwitches, useCreateSwitch, useUpdateSwitch, useDeleteSwitch, useListSites } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";

const SNMP_VERSIONS = ["v2c", "v3"] as const;
type SnmpVersion = typeof SNMP_VERSIONS[number];
interface SwitchForm { name: string; ipAddress: string; model: string; location: string; siteId: string; snmpCommunity: string; snmpVersion: SnmpVersion; }
const EMPTY: SwitchForm = { name: "", ipAddress: "", model: "", location: "", siteId: "", snmpCommunity: "public", snmpVersion: "v2c" };

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  online: "default", offline: "destructive", degraded: "secondary",
};

export default function Switches() {
  const { data: switches, isLoading } = useListSwitches();
  const { data: sites } = useListSites();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SwitchForm>(EMPTY);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/switches"] });

  const createMut = useCreateSwitch({ mutation: { onSuccess: () => { toast({ title: "Switch added" }); invalidate(); setDialogOpen(false); } } });
  const updateMut = useUpdateSwitch({ mutation: { onSuccess: () => { toast({ title: "Switch updated" }); invalidate(); setDialogOpen(false); } } });
  const deleteMut = useDeleteSwitch({ mutation: { onSuccess: () => { toast({ title: "Switch removed" }); invalidate(); setDeleteId(null); } } });

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); };
  const openEdit = (sw: NonNullable<typeof switches>[0]) => {
    setForm({
      name: sw.name, ipAddress: sw.ipAddress,
      model: sw.model ?? "", location: sw.location ?? "",
      siteId: sw.siteId ? String(sw.siteId) : "",
      snmpCommunity: sw.snmpCommunity ?? "public",
      snmpVersion: (sw.snmpVersion ?? "v2c") as SnmpVersion,
    });
    setEditingId(sw.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name, ipAddress: form.ipAddress,
      model: form.model || undefined, location: form.location || undefined,
      siteId: form.siteId ? parseInt(form.siteId) : undefined,
      snmpCommunity: form.snmpCommunity || undefined,
      snmpVersion: form.snmpVersion,
    };
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else createMut.mutate({ data: payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Switches</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Switch</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Network Infrastructure</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Location / Site</TableHead>
                <TableHead>SNMP Community</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : switches && switches.length > 0 ? (
                switches.map(sw => (
                  <TableRow key={sw.id}>
                    <TableCell className="font-medium">{sw.name}</TableCell>
                    <TableCell className="font-mono text-sm">{sw.ipAddress}</TableCell>
                    <TableCell className="text-sm">{sw.model || '-'}</TableCell>
                    <TableCell className="text-sm">{sw.location || sw.site?.name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{sw.snmpCommunity || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[sw.status ?? ""] ?? "secondary"}>{sw.status || 'unknown'}</Badge>
                    </TableCell>
                    <TableCell>{sw.deviceCount ?? 0}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(sw)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(sw.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No switches configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Switch" : "Add Switch"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SW-FLOOR-1" />
              </div>
              <div className="space-y-2">
                <Label>IP Address *</Label>
                <Input value={form.ipAddress} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Catalyst 2960X-48FPD" />
              </div>
              <div className="space-y-2">
                <Label>SNMP Community</Label>
                <Input value={form.snmpCommunity} onChange={e => setForm(f => ({ ...f, snmpCommunity: e.target.value }))} placeholder="public" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Floor 2, Room 201" />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sites?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.ipAddress || createMut.isPending || updateMut.isPending}>
              {editingId ? "Save Changes" : "Add Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Switch?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
