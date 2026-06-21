import { useListPolicies } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Policies() {
  const { data: policies, isLoading } = useListPolicies();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">NAC Policies</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>VLAN</TableHead>
                <TableHead>Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : policies && policies.length > 0 ? (
                policies.map(policy => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-mono text-muted-foreground">{policy.priority}</TableCell>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell className="font-mono text-xs">{policy.condition}</TableCell>
                    <TableCell>
                      <Badge variant={policy.action === 'deny_access' || policy.action === 'quarantine' ? 'destructive' : 'secondary'}>
                        {policy.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.vlanId ? `VLAN ${policy.vlanId}` : '-'}</TableCell>
                    <TableCell>
                      <Switch checked={policy.enabled} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No policies configured.
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