import { useState } from "react";
import { useListRadiusClients, useListRadiusGroups, useGetRadiusSyncStatus, useSyncToRadius } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Radius() {
  const { data: clients, isLoading: clientsLoading } = useListRadiusClients();
  const { data: groups, isLoading: groupsLoading } = useListRadiusGroups();
  const { data: syncStatus, isLoading: syncLoading } = useGetRadiusSyncStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const syncMutation = useSyncToRadius({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Sync completed", description: `Synced ${data.synced} devices. Failed: ${data.failed}` });
        queryClient.invalidateQueries({ queryKey: ["/api/radius/sync-status"] });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">FreeRADIUS</h1>
        <div className="flex items-center gap-4">
          {!syncLoading && syncStatus && (
            <Badge variant="outline" className="px-3 py-1">
              Last sync: {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'Never'}
            </Badge>
          )}
          <Button onClick={() => syncMutation.mutate({ data: {} })} disabled={syncMutation.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">RADIUS Clients</TabsTrigger>
          <TabsTrigger value="groups">RADIUS Groups</TabsTrigger>
        </TabsList>
        
        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>RADIUS Clients</CardTitle>
                <CardDescription>Network devices authorized to query RADIUS.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>NAS Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      </TableRow>
                    ))
                  ) : clients && clients.length > 0 ? (
                    clients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="font-mono text-sm">{client.ipAddress}</TableCell>
                        <TableCell>{client.nasType || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{client.description || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No RADIUS clients configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>RADIUS Groups</CardTitle>
                <CardDescription>Groups mapped to VLANs for dynamic authorization.</CardDescription>
              </div>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Group</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>VLAN</TableHead>
                    <TableHead>Attribute</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Devices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))
                  ) : groups && groups.length > 0 ? (
                    groups.map(group => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.vlanId ? `VLAN ${group.vlanId}` : '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{group.attribute || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{group.value || '-'}</TableCell>
                        <TableCell>{group.deviceCount || 0}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No RADIUS groups configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}