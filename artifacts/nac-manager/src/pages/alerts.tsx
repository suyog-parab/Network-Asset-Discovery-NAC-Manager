import { useState } from "react";
import { useListAlerts, useAcknowledgeAlert, useResolveAlert, AlertStatus, AlertSeverity } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Bell } from "lucide-react";

const SEVERITY_BADGE = {
  critical: <Badge variant="destructive">Critical</Badge>,
  warning: <Badge className="bg-amber-500 hover:bg-amber-600">Warning</Badge>,
  info: <Badge variant="secondary">Info</Badge>,
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-destructive/15 text-destructive border-destructive/20",
  acknowledged: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  resolved: "bg-green-500/15 text-green-500 border-green-500/20",
};

export default function Alerts() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AlertStatus | "ALL">("ALL");
  const [severity, setSeverity] = useState<AlertSeverity | "ALL">("ALL");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const limit = 50;

  const { data, isLoading } = useListAlerts({
    page, limit,
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/alerts/counts"] });
  };

  const ackMut = useAcknowledgeAlert({ mutation: { onSuccess: () => { toast({ title: "Alert acknowledged" }); invalidate(); } } });
  const resolveMut = useResolveAlert({ mutation: { onSuccess: () => { toast({ title: "Alert resolved" }); invalidate(); } } });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total alerts</p>
        </div>
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="flex gap-4">
        <Select value={status} onValueChange={(val: string) => { setStatus(val as AlertStatus | "ALL"); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(AlertStatus).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={severity} onValueChange={(val: string) => { setSeverity(val as AlertSeverity | "ALL"); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            {Object.values(AlertSeverity).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-36">Time</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map(alert => (
                  <TableRow key={alert.id} className={alert.status === 'open' ? "bg-muted/20" : ""}>
                    <TableCell>
                      {SEVERITY_BADGE[alert.severity as keyof typeof SEVERITY_BADGE] || <Badge variant="secondary">{alert.severity}</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{alert.type}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{alert.message}</p>
                      {alert.device && (
                        <p className="text-xs text-muted-foreground mt-0.5">Device: {alert.device.macAddress}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLE[alert.status] ?? ""}`}>
                        {alert.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {alert.status === 'open' && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => ackMut.mutate({ id: alert.id })}
                            disabled={ackMut.isPending}
                            title="Acknowledge"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Ack
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            size="sm"
                            onClick={() => resolveMut.mutate({ id: alert.id })}
                            disabled={resolveMut.isPending}
                            title="Resolve"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No alerts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
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
