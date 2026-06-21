import { useListSwitches } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default function Switches() {
  const { data: switches, isLoading } = useListSwitches();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Switches</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Switch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Network Infrastructure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Devices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : switches && switches.length > 0 ? (
                switches.map(sw => (
                  <TableRow key={sw.id}>
                    <TableCell className="font-medium">{sw.name}</TableCell>
                    <TableCell className="font-mono text-sm">{sw.ipAddress}</TableCell>
                    <TableCell>{sw.model || '-'}</TableCell>
                    <TableCell>{sw.location || sw.site?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={sw.status === 'online' ? 'default' : sw.status === 'offline' ? 'destructive' : 'secondary'}>
                        {sw.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{sw.deviceCount || 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No switches configured.
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