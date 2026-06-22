import { useState } from "react";
import { useListSites, useCreateSite, useUpdateSite, useDeleteSite } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";

const SITE_TYPES = ["site", "branch", "building", "floor", "rack"] as const;
type SiteType = typeof SITE_TYPES[number];
interface SiteForm { name: string; code: string; type: SiteType; address: string; }
const EMPTY: SiteForm = { name: "", code: "", type: "branch", address: "" };

export default function Sites() {
  const { data: sites, isLoading } = useListSites();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SiteForm>(EMPTY);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/sites"] });

  const createMut = useCreateSite({ mutation: { onSuccess: () => { toast({ title: "Site created" }); invalidate(); setDialogOpen(false); } } });
  const updateMut = useUpdateSite({ mutation: { onSuccess: () => { toast({ title: "Site updated" }); invalidate(); setDialogOpen(false); } } });
  const deleteMut = useDeleteSite({ mutation: { onSuccess: () => { toast({ title: "Site deleted" }); invalidate(); setDeleteId(null); } } });

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); };
  const openEdit = (s: NonNullable<typeof sites>[0]) => {
    setForm({ name: s.name, code: s.code ?? "", type: (s.type ?? "branch") as SiteType, address: s.address ?? "" });
    setEditingId(s.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = { name: form.name, code: form.code || undefined, type: form.type as SiteType, address: form.address || undefined };
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else createMut.mutate({ data: payload });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Site</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Locations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Switches</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : sites && sites.length > 0 ? (
                sites.map(site => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="font-mono text-xs">{site.code || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{site.type || 'branch'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{site.address || '-'}</TableCell>
                    <TableCell>{site.deviceCount ?? 0}</TableCell>
                    <TableCell>{site.switchCount ?? 0}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(site)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(site.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No sites configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Site" : "Add Site"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="New York HQ" />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="NYC-HQ" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as SiteType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SITE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="123 Main St, New York, NY" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createMut.isPending || updateMut.isPending}>
              {editingId ? "Save Changes" : "Add Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
