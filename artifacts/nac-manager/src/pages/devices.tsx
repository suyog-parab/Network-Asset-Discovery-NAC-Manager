import { useState } from "react";
import { Link } from "wouter";
import { useListDevices, DeviceStatus } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Devices() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "ALL">("ALL");

  const { data, isLoading } = useListDevices({
    page,
    limit: 50,
    search: search || undefined,
    status: status === "ALL" ? undefined : status
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Device Inventory</h1>
      </div>

      <div className="flex items-center gap-4">
        <Input 
          placeholder="Search MAC, IP, Hostname..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(val: any) => setStatus(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(DeviceStatus).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MAC Address</TableHead>
              <TableHead>IP / Hostname</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Switch / Port</TableHead>
              <TableHead>VLAN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : data?.data && data.data.length > 0 ? (
              data.data.map(device => (
                <TableRow key={device.id}>
                  <TableCell className="font-mono text-sm">
                    <Link href={`/devices/${device.id}`} className="text-primary hover:underline">
                      {device.macAddress}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{device.ipAddress || '-'}</div>
                    <div className="text-xs text-muted-foreground">{device.hostname || '-'}</div>
                  </TableCell>
                  <TableCell>{device.vendor || '-'}</TableCell>
                  <TableCell>
                    <div>{device.switchName || '-'}</div>
                    <div className="text-xs text-muted-foreground">{device.switchPort || '-'}</div>
                  </TableCell>
                  <TableCell>{device.vlan?.vlanId ? `VLAN ${device.vlan.vlanId}` : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={device.status === 'APPROVED' ? 'default' : device.status === 'QUARANTINED' ? 'destructive' : 'secondary'}>
                      {device.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(device.lastSeen).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No devices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}