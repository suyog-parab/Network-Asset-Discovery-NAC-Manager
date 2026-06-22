import { useState } from "react";
import {
  useListRadiusClients, useCreateRadiusClient, useUpdateRadiusClient, useDeleteRadiusClient,
  useListRadiusGroups, useCreateRadiusGroup, useUpdateRadiusGroup, useDeleteRadiusGroup,
  useGetRadiusSyncStatus, useSyncToRadius, useListVlans
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plus, MoreVertical, Pencil, Trash2, Badge as BadgeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientForm { name: string; ipAddress: string; secret: string; nasType: string; description: string; }
const EMPTY_CLIENT: ClientForm = { name: "", ipAddress: "", secret: "", nasType: "cisco", description: "" };

interface GroupForm { name: string; attribute: string; value: string; vlanId: string; }
const EMPTY_GROUP: GroupForm = { name: "", attribute: "Tunnel-Private-Group-ID", value: "", vlanId: "" };

export default function Radius() {
  const { data: clients, isLoading: clientsLoading } = useListRadiusClients();
  const { data: groups, isLoading: groupsLoading } = useListRadiusGroups();
  const { data: syncStatus } = useGetRadiusSyncStatus();
  const { data: vlans } = useListVlans();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [clientDialog, setClientDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(EMPTY_CLIENT);
  const [groupForm, setGroupForm] = useState<GroupForm>(EMPTY_GROUP);

  const invalidateClients = () => queryClient.invalidateQueries({ queryKey: ["/api/radius/clients"] });
  const invalidateGroups = () => queryClient.invalidateQueries({ queryKey: ["/api/radius/groups"] });

  const syncMut = useSyncToRadius({
    mutation: {
      onSuccess: (d) => {
        toast({ title: "Sync complete", description: `Synced ${d.synced} devices to FreeRADIUS. Failed: ${d.failed}` });
        queryClient.invalidateQueries({ queryKey: ["/api/radius/sync-status"] });
      },
      onError: () => toast({ title: "Sync failed", variant: "destructive" }),
    }
  });

  const createClientMut = useCreateRadiusClient({ mutation: { onSuccess: () => { toast({ title: "Client added" }); invalidateClients(); setClientDialog(false); } } });
  const updateClientMut = useUpdateRadiusClient({ mutation: { onSuccess: () => { toast({ title: "Client updated" }); invalidateClients(); setClientDialog(false); } } });
  const deleteClientMut = useDeleteRadiusClient({ mutation: { onSuccess: () => { toast({ title: "Client removed" }); invalidateClients(); setDeleteClientId(null); } } });

  const createGroupMut = useCreateRadiusGroup({ mutation: { onSuccess: () => { toast({ title: "Group created" }); invalidateGroups(); setGroupDialog(false); } } });
  const updateGroupMut = useUpdateRadiusGroup({ mutation: { onSuccess: () => { toast({ title: "Group updated" }); invalidateGroups(); setGroupDialog(false); } } });
  const deleteGroupMut = useDeleteRadiusGroup({ mutation: { onSuccess: () => { toast({ title: "Group deleted" }); invalidateGroups(); setDeleteGroupId(null); } } });

  const openCreateClient = () => { setClientForm(EMPTY_CLIENT); setEditingClientId(null); setClientDialog(true); };
  const openEditClient = (c: NonNullable<typeof clients>[0]) => {
    setClientForm({ name: c.name, ipAddress: c.ipAddress, secret: c.secret ?? "", nasType: c.nasType ?? "cisco", description: c.description ?? "" });
    setEditingClientId(c.id);
    setClientDialog(true);
  };

  const openCreateGroup = () => { setGroupForm(EMPTY_GROUP); setEditingGroupId(null); setGroupDialog(true); };
  const openEditGroup = (g: NonNullable<typeof groups>[0]) => {
    setGroupForm({ name: g.name, attribute: g.attribute ?? "Tunnel-Private-Group-ID", value: g.value ?? "", vlanId: g.vlanId ? String(g.vlanId) : "" });
    setEditingGroupId(g.id);
    setGroupDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FreeRADIUS</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage clients, groups, and sync approved devices</p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus && (
            <div className="text-right text-xs text-muted-foreground">
              <div>Synced: <strong>{syncStatus.syncedCount}</strong></div>
              <div>Pending: <strong>{syncStatus.pendingSyncCount}</strong></div>
            </div>
          )}
          <Button onClick={() => syncMut.mutate({ data: {} })} disabled={syncMut.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMut.isPending ? 'animate-spin' : ''}`} />
            {syncMut.isPending ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      {syncStatus?.lastSyncAt && (
        <p className="text-xs text-muted-foreground">Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}</p>
      )}

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">RADIUS Clients ({clients?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="groups">RADIUS Groups ({groups?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>NAS Clients</CardTitle>
                <CardDescription>Network devices authorized to send requests to FreeRADIUS.</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateClient}><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>NAS Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : clients && clients.length > 0 ? (
                    clients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="font-mono text-sm">{client.ipAddress}</TableCell>
                        <TableCell><Badge variant="outline">{client.nasType || 'other'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{client.description || '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditClient(client)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteClientId(client.id)}><Trash2 className="h-4 w-4 mr-2" /> Remove</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No RADIUS clients configured.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Authorization Groups</CardTitle>
                <CardDescription>Groups map device categories to RADIUS reply attributes (VLAN assignment).</CardDescription>
              </div>
              <Button size="sm" onClick={openCreateGroup}><Plus className="mr-2 h-4 w-4" /> Add Group</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>VLAN</TableHead>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : groups && groups.length > 0 ? (
                    groups.map(group => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.vlan ? `VLAN ${group.vlan.vlanId}` : '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{group.attribute || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{group.value || '-'}</TableCell>
                        <TableCell>{group.deviceCount ?? 0}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditGroup(group)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteGroupId(group.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No groups configured.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingClientId ? "Edit RADIUS Client" : "Add RADIUS Client"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} placeholder="switch-floor1" />
              </div>
              <div className="space-y-2">
                <Label>IP Address *</Label>
                <Input value={clientForm.ipAddress} onChange={e => setClientForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shared Secret *</Label>
                <Input type="password" value={clientForm.secret} onChange={e => setClientForm(f => ({ ...f, secret: e.target.value }))} placeholder="radius_secret_123" />
              </div>
              <div className="space-y-2">
                <Label>NAS Type</Label>
                <Select value={clientForm.nasType} onValueChange={v => setClientForm(f => ({ ...f, nasType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cisco", "juniper", "aruba", "other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={clientForm.description} onChange={e => setClientForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              const p = { name: clientForm.name, ipAddress: clientForm.ipAddress, secret: clientForm.secret, nasType: clientForm.nasType, description: clientForm.description || undefined };
              if (editingClientId) updateClientMut.mutate({ id: editingClientId, data: p });
              else createClientMut.mutate({ data: p });
            }} disabled={!clientForm.name || !clientForm.ipAddress}>
              {editingClientId ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroupId ? "Edit Group" : "Add Group"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Corporate-Users" />
            </div>
            <div className="space-y-2">
              <Label>Assign VLAN</Label>
              <Select value={groupForm.vlanId} onValueChange={v => setGroupForm(f => ({ ...f, vlanId: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {vlans?.map(v => <SelectItem key={v.id} value={String(v.id)}>VLAN {v.vlanId} – {v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RADIUS Attribute</Label>
                <Input value={groupForm.attribute} onChange={e => setGroupForm(f => ({ ...f, attribute: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input value={groupForm.value} onChange={e => setGroupForm(f => ({ ...f, value: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              const p = { name: groupForm.name, attribute: groupForm.attribute || undefined, value: groupForm.value || undefined, vlanId: groupForm.vlanId ? parseInt(groupForm.vlanId) : undefined };
              if (editingGroupId) updateGroupMut.mutate({ id: editingGroupId, data: p });
              else createGroupMut.mutate({ data: p });
            }} disabled={!groupForm.name}>
              {editingGroupId ? "Save Changes" : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={deleteClientId !== null} onOpenChange={() => setDeleteClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove RADIUS Client?</AlertDialogTitle><AlertDialogDescription>The switch will no longer be able to send RADIUS requests.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteClientId && deleteClientMut.mutate({ id: deleteClientId })}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGroupId !== null} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Group?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteGroupId && deleteGroupMut.mutate({ id: deleteGroupId })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
