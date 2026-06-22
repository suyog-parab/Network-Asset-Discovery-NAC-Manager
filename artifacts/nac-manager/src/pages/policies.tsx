import { useState } from "react";
import { useListPolicies, useCreatePolicy, useUpdatePolicy, useDeletePolicy, useListVlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, Shield } from "lucide-react";

const ACTIONS = ["assign_vlan", "deny_access", "quarantine", "alert", "approve"] as const;
type PolicyAction = typeof ACTIONS[number];
const CONDITIONS = ["known_device", "unknown_device", "rejected_device", "port_change", "duplicate_mac", "duplicate_ip"] as const;
type PolicyCondition = typeof CONDITIONS[number];

interface PolicyForm {
  name: string;
  condition: PolicyCondition;
  action: PolicyAction;
  priority: number;
  vlanId: string;
  description: string;
  enabled: boolean;
}

const EMPTY_FORM: PolicyForm = { name: "", condition: "unknown_device", action: "deny_access", priority: 100, vlanId: "", description: "", enabled: true };

export default function Policies() {
  const { data: policies, isLoading } = useListPolicies();
  const { data: vlans } = useListVlans();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PolicyForm>(EMPTY_FORM);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/policies"] });

  const createMut = useCreatePolicy({
    mutation: {
      onSuccess: () => { toast({ title: "Policy created" }); invalidate(); setDialogOpen(false); }
    }
  });
  const updateMut = useUpdatePolicy({
    mutation: {
      onSuccess: () => { toast({ title: "Policy updated" }); invalidate(); setDialogOpen(false); }
    }
  });
  const deleteMut = useDeletePolicy({
    mutation: {
      onSuccess: () => { toast({ title: "Policy deleted" }); invalidate(); setDeleteId(null); }
    }
  });

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
  const openEdit = (p: NonNullable<typeof policies>[0]) => {
    setForm({
      name: p.name,
      condition: (p.condition ?? "unknown_device") as PolicyCondition,
      action: (p.action ?? "deny_access") as PolicyAction,
      priority: p.priority,
      vlanId: p.vlanId ? String(p.vlanId) : "",
      description: p.description ?? "",
      enabled: p.enabled ?? true,
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      condition: form.condition,
      action: form.action,
      priority: form.priority,
      vlanId: form.vlanId ? parseInt(form.vlanId) : undefined,
      description: form.description || undefined,
      enabled: form.enabled,
    };
    if (editingId) updateMut.mutate({ id: editingId, data: payload as any });
    else createMut.mutate({ data: payload as any });
  };

  const toggleEnabled = (p: NonNullable<typeof policies>[0]) => {
    updateMut.mutate({ id: p.id, data: { enabled: !p.enabled } as any });
  };

  const actionColor = (a: string): "default" | "destructive" | "secondary" | "outline" => {
    if (a === "deny_access" || a === "quarantine") return "destructive";
    if (a === "allow_access") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NAC Policies</h1>
          <p className="text-muted-foreground text-sm mt-1">Evaluated in priority order against every authorization request</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Policy Rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Priority</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>VLAN</TableHead>
                <TableHead className="w-20">Enabled</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : policies && policies.length > 0 ? (
                policies.map(policy => (
                  <TableRow key={policy.id} className={!policy.enabled ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm text-muted-foreground">{policy.priority}</TableCell>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{policy.condition || '*'}</TableCell>
                    <TableCell>
                      <Badge variant={actionColor(policy.action)}>{policy.action.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>{policy.vlanId ? `VLAN ${policy.vlanId}` : '-'}</TableCell>
                    <TableCell>
                      <Switch checked={policy.enabled} onCheckedChange={() => toggleEnabled(policy)} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(policy)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(policy.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No policies configured. Add a policy to control device access.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Policy" : "Create Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Allow Trusted Devices" />
              </div>
              <div className="space-y-2">
                <Label>Priority (lower = higher priority)</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 100 }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition *</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as PolicyCondition }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action *</Label>
                <Select value={form.action} onValueChange={v => setForm(f => ({ ...f, action: v as PolicyAction }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign VLAN (optional)</Label>
                <Select value={form.vlanId} onValueChange={v => setForm(f => ({ ...f, vlanId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vlans?.map(v => <SelectItem key={v.id} value={String(v.id)}>VLAN {v.vlanId} – {v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editingId ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the policy from the enforcement engine.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
