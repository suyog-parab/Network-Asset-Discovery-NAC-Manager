import { useParams } from "wouter";
import { useGetDevice, useGetDeviceHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const deviceId = parseInt(id, 10);
  
  const { data: device, isLoading } = useGetDevice(deviceId);
  const { data: history, isLoading: historyLoading } = useGetDeviceHistory(deviceId);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!device) {
    return <div>Device not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Device Details: <span className="font-mono text-primary">{device.macAddress}</span></h1>
        <Badge className="text-sm px-3 py-1" variant={device.status === 'APPROVED' ? 'default' : device.status === 'QUARANTINED' ? 'destructive' : 'secondary'}>
          {device.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Network Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p>{device.ipAddress || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hostname</p>
                <p>{device.hostname || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendor</p>
                <p>{device.vendor || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">OS</p>
                <p>{device.operatingSystem || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Switch / Port</p>
                <p>{device.switchName || '-'} / {device.switchPort || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">VLAN</p>
                <p>{device.vlan ? `${device.vlan.name} (${device.vlan.vlanId})` : 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <Skeleton className="h-32" />
            ) : history && history.length > 0 ? (
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={h.id} className="text-sm pb-4 border-b last:border-0 last:pb-0">
                    <p className="font-medium">{h.action}</p>
                    <p className="text-muted-foreground text-xs">{new Date(h.createdAt).toLocaleString()} by {h.performedBy || 'System'}</p>
                    {h.notes && <p className="text-muted-foreground mt-1">{h.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No history available.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}