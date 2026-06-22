import { useParams, useLocation } from "wouter";
import {
  useGetDevice, useGetDeviceHistory, useApproveDevice,
  useRejectDevice, useQuarantineDevice, useListVlans
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle, XCircle, ShieldAlert, ArrowLeft, Clock, Wifi } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default", SYNCED: "default", QUARANTINED: "destructive",
  PENDING: "secondary", REJECTED: "outline",
};

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const deviceId = parseInt(id, 10);
  const [selectedVlan, setSelectedVlan] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: device, isLoading } = useGetDevice(deviceId);
  const { data: history, isLoading: historyLoading } = useGetDeviceHistory(deviceId);
  const { data: vlans } = useListVlans();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/devices"] });

  const approveMut = useApproveDevice({
    mutation: {
      onSuccess: () => { toast({ title: "Device approved and synced to RADIUS" }); invalidate(); }
    }
  });
  const rejectMut = useRejectDevice({
    mutation: {
      onSuccess: () => { toast({ title: "Device rejected" }); invalidate(); }
    }
  });
  const quarantineMut = useQuarantineDevice({
    mutation: {
      onSuccess: () => { toast({ title: "Device quarantined (VLAN 999)" }); invalidate(); }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Device not found.</p>
        <Button variant="link" onClick={() => setLocation("/devices")}>Back to Inventory</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/devices")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold font-mono text-primary flex-1">{device.macAddress}</h1>
        <Badge className="text-sm px-3 py-1" variant={STATUS_COLORS[device.status] ?? "secondary"}>
          {device.status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {device.status !== "APPROVED" && device.status !== "SYNCED" && (
          <div className="flex items-center gap-2">
            <Select value={selectedVlan} onValueChange={setSelectedVlan}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Select VLAN" />
              </SelectTrigger>
              <SelectContent>
                {vlans?.map(v => <SelectItem key={v.id} value={String(v.id)}>VLAN {v.vlanId} – {v.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              onClick={() => approveMut.mutate({ id: device.id, data: { vlanId: selectedVlan ? parseInt(selectedVlan) : undefined } })}
              disabled={approveMut.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Approve
            </Button>
          </div>
        )}
        {device.status !== "QUARANTINED" && (
          <Button variant="outline" onClick={() => quarantineMut.mutate({ id: device.id })} disabled={quarantineMut.isPending}>
            <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" /> Quarantine
          </Button>
        )}
        {device.status !== "REJECTED" && (
          <Button variant="destructive" onClick={() => rejectMut.mutate({ id: device.id, data: { reason: "Manual rejection" } })} disabled={rejectMut.isPending}>
            <XCircle className="h-4 w-4 mr-2" /> Reject
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wifi className="h-4 w-4" /> Network Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              {[
                ["MAC Address", device.macAddress],
                ["IP Address", device.ipAddress || "Unknown"],
                ["Hostname", device.hostname || "Unknown"],
                ["Vendor", device.vendor || "Unknown"],
                ["Operating System", device.operatingSystem || "Unknown"],
                ["Department", device.department || "Unknown"],
                ["Switch", device.switchName || "Unknown"],
                ["Port", device.switchPort || "Unknown"],
                ["VLAN", device.vlan ? `${device.vlan.name} (VLAN ${device.vlan.vlanId})` : "Unassigned"],
                ["RADIUS Synced", device.radiusSynced ? "Yes" : "No"],
                ["First Seen", device.firstSeen ? new Date(device.firstSeen).toLocaleString() : "Unknown"],
                ["Last Seen", new Date(device.lastSeen).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-xs mt-1">{value as string}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> History</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-40" />
            ) : history && history.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="text-sm pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{h.action.replace(/_/g, " ")}</span>
                      {h.newStatus && (
                        <Badge variant={STATUS_COLORS[h.newStatus] ?? "secondary"} className="text-xs">{h.newStatus}</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      {new Date(h.createdAt).toLocaleString()} · {h.performedBy || "System"}
                    </p>
                    {h.notes && <p className="text-muted-foreground text-xs mt-1 italic">{h.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">No history available.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
