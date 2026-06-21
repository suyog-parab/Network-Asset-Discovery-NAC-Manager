import { useListVlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default function Vlans() {
  const { data: vlans, isLoading } = useListVlans();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">VLANs</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add VLAN
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VLAN Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VLAN ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : vlans && vlans.length > 0 ? (
                vlans.map(vlan => (
                  <TableRow key={vlan.id}>
                    <TableCell className="font-mono font-medium">{vlan.vlanId}</TableCell>
                    <TableCell className="font-medium">{vlan.name}</TableCell>
                    <TableCell className="capitalize text-xs">{vlan.type}</TableCell>
                    <TableCell className="text-muted-foreground">{vlan.description || '-'}</TableCell>
                    <TableCell>{vlan.deviceCount || 0}</TableCell>
                    <TableCell>
                      {vlan.isQuarantine ? (
                        <Badge variant="destructive">Quarantine</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No VLANs configured.
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