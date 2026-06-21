import { useState } from "react";
import { Link } from "wouter";
import { useListDevices, DeviceStatus, useApproveDevice, useRejectDevice } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Quarantine() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListDevices({
    page,
    limit: 50,
    search: search || undefined,
    status: DeviceStatus.QUARANTINED
  });

  const approveMutation = useApproveDevice({
    mutation: {
      onSuccess: () => {
        toast({ title: "Device approved" });
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      }
    }
  });

  const rejectMutation = useRejectDevice({
    mutation: {
      onSuccess: () => {
        toast({ title: "Device rejected" });
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Quarantined Devices</h1>
      </div>

      <div className="flex items-center gap-4">
        <Input 
          placeholder="Search MAC, IP, Hostname..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border border-destructive/20 rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MAC Address</TableHead>
              <TableHead>IP / Hostname</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
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
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
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
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveMutation.mutate({ id: device.id, data: { vlanId: device.vlanId || undefined } })}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ id: device.id, data: { reason: "Manual rejection from quarantine" } })}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No quarantined devices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}