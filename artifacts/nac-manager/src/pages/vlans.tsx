import { useState } from "react";
import { useListVlans, useCreateVlan, useUpdateVlan, useDeleteVlan } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";

const VLAN_TYPES = ["production", "quarantine", "guest", "management"] as const;
type VlanType = typeof VLAN_TYPES[number];

interface VlanForm { vlanId: number; name: string; description: string; type: VlanType; isQuarantine: boolean; }
const EMPTY: VlanForm = { vlanId: 100, name: "", description: "", type: "production", isQuarantine: false };

export default function Vlans() {
  const { data: vlans, isLoading } = useListVlans();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VlanForm>(EMPTY);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/vlans"] });

  const createMut = useCreateVlan({ mutation: { onSuccess: () => { toast({ title: "VLAN created" }); invalidate(); setDialogOpen(false); } } });
  const updateMut = useUpdateVlan({ mutation: { onSuccess: () => { toast({ title: "VLAN updated" }); invalidate(); setDialogOpen(false); } } });
  const deleteMut = useDeleteVlan({ mutation: { onSuccess: () => { toast({ title: "VLAN deleted" }); invalidate(); setDeleteId(null); } } });

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); };
  const openEdit = (v: NonNullable<typeof vlans>[0]) => {
    setForm({ vlanId: v.vlanId, name: v.name, description: v.description ?? "", type: (v.type ?? "production") as VlanType, isQuarantine: v.isQuarantine ?? false });
    setEditingId(v.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = { vlanId: form.vlanId, name: form.name, description: form.description || undefined, type: form.type as VlanType, isQuarantine: form.isQuarantine };
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else createMut.mutate({ data: payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">VLANs</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add VLAN</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>VLAN Configuration</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VLAN ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : vlans && vlans.length > 0 ? (
                vlans.map(vlan => (
                  <TableRow key={vlan.id}>
                    <TableCell className="font-mono font-bold">{vlan.vlanId}</TableCell>
                    <TableCell className="font-medium">{vlan.name}</TableCell>
                    <TableCell className="capitalize text-xs">{vlan.type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{vlan.description || '-'}</TableCell>
                    <TableCell>{vlan.deviceCount ?? 0}</TableCell>
                    <TableCell>
                      {vlan.isQuarantine ? <Badge variant="destructive">Quarantine</Badge> : <Badge variant="secondary">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(vlan)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(vlan.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No VLANs configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit VLAN" : "Add VLAN"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>VLAN ID *</Label>
                <Input type="number" min={1} max={4094} value={form.vlanId} onChange={e => setForm(f => ({ ...f, vlanId: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Corporate" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as VlanType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VLAN_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <Switch checked={form.isQuarantine} onCheckedChange={v => setForm(f => ({ ...f, isQuarantine: v }))} />
                <Label>Quarantine VLAN</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editingId ? "Save Changes" : "Add VLAN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VLAN?</AlertDialogTitle>
            <AlertDialogDescription>Devices assigned to this VLAN will be unassigned. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
