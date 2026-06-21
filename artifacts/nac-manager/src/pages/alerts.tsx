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
import { Check, CheckCircle2 } from "lucide-react";

export default function Alerts() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AlertStatus | "ALL">("ALL");
  const [severity, setSeverity] = useState<AlertSeverity | "ALL">("ALL");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListAlerts({
    page,
    limit: 50,
    status: status === "ALL" ? undefined : status,
    severity: severity === "ALL" ? undefined : severity
  });

  const ackMutation = useAcknowledgeAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert acknowledged" });
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/alerts/counts"] });
      }
    }
  });

  const resolveMutation = useResolveAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert resolved" });
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/alerts/counts"] });
      }
    }
  });

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'warning': return <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">Warning</Badge>;
      default: return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
      </div>

      <div className="flex gap-4">
        <Select value={status} onValueChange={(val: any) => setStatus(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.values(AlertStatus).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severity} onValueChange={(val: any) => setSeverity(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            {Object.values(AlertSeverity).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data && data.data.length > 0 ? (
                data.data.map(alert => (
                  <TableRow key={alert.id} className={alert.status === 'open' ? 'bg-muted/30' : ''}>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell className="font-mono text-xs">{alert.type}</TableCell>
                    <TableCell>
                      <span className="font-medium">{alert.message}</span>
                      {alert.device && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          Device: {alert.device.macAddress}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.status === 'open' ? 'bg-destructive/20 text-destructive' :
                        alert.status === 'acknowledged' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-primary/20 text-primary'
                      }`}>
                        {alert.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {alert.status === 'open' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => ackMutation.mutate({ id: alert.id })}
                            disabled={ackMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Ack
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button 
                            size="sm" 
                            onClick={() => resolveMutation.mutate({ id: alert.id })}
                            disabled={resolveMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No alerts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}