import { useState } from "react";
import { Link } from "wouter";
import {
  useListDevices, useApproveDevice, useRejectDevice, useQuarantineDevice,
  useBulkApproveDevices, useBulkRejectDevices, useBulkAssignVlan,
  useListVlans, DeviceStatus
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, ShieldAlert, ChevronLeft, ChevronRight, MoreHorizontal, MoreVertical } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  SYNCED: "default",
  QUARANTINED: "destructive",
  PENDING: "secondary",
  REJECTED: "outline",
};

export default function Devices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const limit = 50;

  const { data, isLoading } = useListDevices({
    page,
    limit,
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const { data: vlans } = useListVlans();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    setSelected(new Set());
  };

  const approveMut = useApproveDevice({ mutation: { onSuccess: () => { toast({ title: "Device approved and synced to RADIUS" }); invalidate(); } } });
  const rejectMut = useRejectDevice({ mutation: { onSuccess: () => { toast({ title: "Device rejected and removed from RADIUS" }); invalidate(); } } });
  const quarantineMut = useQuarantineDevice({ mutation: { onSuccess: () => { toast({ title: "Device quarantined (VLAN 999)" }); invalidate(); } } });
  const bulkApproveMut = useBulkApproveDevices({ mutation: { onSuccess: (d) => { toast({ title: `Bulk approved ${d.succeeded} devices` }); invalidate(); } } });
  const bulkRejectMut = useBulkRejectDevices({ mutation: { onSuccess: (d) => { toast({ title: `Bulk rejected ${d.succeeded} devices` }); invalidate(); } } });
  const bulkVlanMut = useBulkAssignVlan({ mutation: { onSuccess: () => { toast({ title: "VLAN assigned to selected devices" }); invalidate(); } } });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const devices = data?.data ?? [];

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === devices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(devices.map(d => d.id)));
    }
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Device Inventory</h1>
        <div className="text-sm text-muted-foreground">{total} total devices</div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search MAC, IP, Hostname, Vendor..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(val: string) => { setStatus(val as DeviceStatus | "ALL"); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(DeviceStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" onClick={() => bulkApproveMut.mutate({ data: { ids: selectedIds } })} disabled={bulkApproveMut.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkRejectMut.mutate({ data: { ids: selectedIds } })} disabled={bulkRejectMut.isPending}>
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Select onValueChange={(vlanId) => bulkVlanMut.mutate({ data: { ids: selectedIds, vlanId: parseInt(vlanId) } })}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Assign VLAN" />
              </SelectTrigger>
              <SelectContent>
                {vlans?.map(v => <SelectItem key={v.id} value={String(v.id)}>VLAN {v.vlanId} – {v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selected.size === devices.length && devices.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>MAC Address</TableHead>
              <TableHead>IP / Hostname</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Switch / Port</TableHead>
              <TableHead>VLAN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : devices.length > 0 ? (
              devices.map(device => (
                <TableRow key={device.id} className={selected.has(device.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox checked={selected.has(device.id)} onCheckedChange={() => toggleSelect(device.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <Link href={`/devices/${device.id}`} className="text-primary hover:underline">
                      {device.macAddress}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{device.ipAddress || '-'}</div>
                    <div className="text-xs text-muted-foreground">{device.hostname || '-'}</div>
                  </TableCell>
                  <TableCell className="text-sm">{device.vendor || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">{device.switchName || '-'}</div>
                    <div className="text-xs text-muted-foreground">{device.switchPort || '-'}</div>
                  </TableCell>
                  <TableCell>{device.vlan?.vlanId ? `VLAN ${device.vlan.vlanId}` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[device.status] ?? "secondary"}>{device.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(device.lastSeen).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/devices/${device.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => approveMut.mutate({ id: device.id, data: { vlanId: device.vlanId || undefined } })}
                          disabled={device.status === "APPROVED" || device.status === "SYNCED" || approveMut.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => quarantineMut.mutate({ id: device.id })}
                          disabled={device.status === "QUARANTINED" || quarantineMut.isPending}
                        >
                          <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" /> Quarantine
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => rejectMut.mutate({ id: device.id, data: { reason: "Manual rejection" } })}
                          disabled={device.status === "REJECTED" || rejectMut.isPending}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No devices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} devices)
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
