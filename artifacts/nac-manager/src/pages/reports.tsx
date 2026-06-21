import { useGetInventoryReport, useGetComplianceReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

export default function Reports() {
  const { data: inventory, isLoading: invLoading } = useGetInventoryReport();
  const { data: compliance, isLoading: compLoading } = useGetComplianceReport();

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
  const COMPLIANCE_COLORS = ['#10b981', '#ef4444']; // Compliant vs Non-compliant

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Compliance Report */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>NAC Compliance</CardTitle>
            <CardDescription>Network access control enforcement status</CardDescription>
          </CardHeader>
          <CardContent>
            {compLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : compliance ? (
              <div className="flex flex-col items-center">
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Compliant', value: compliance.complianceRate },
                          { name: 'Non-Compliant', value: 100 - compliance.complianceRate }
                        ]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={60} outerRadius={80}
                        dataKey="value"
                      >
                        {COMPLIANCE_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
                    <span className="text-4xl font-bold">{compliance.complianceRate}%</span>
                    <span className="text-sm text-muted-foreground">Compliant</span>
                  </div>
                </div>
                
                <div className="w-full grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">{compliance.approvedDevices}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-500">{compliance.pendingDevices}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-destructive">{compliance.quarantinedDevices}</div>
                    <div className="text-sm text-muted-foreground">Quarantined</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold">{compliance.totalDevices}</div>
                    <div className="text-sm text-muted-foreground">Total Devices</div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Inventory By Status */}
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Inventory by Status</CardTitle>
            <CardDescription>Device breakdown by current lifecycle status</CardDescription>
          </CardHeader>
          <CardContent>
            {invLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : inventory && inventory.byStatus ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventory.byStatus} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {inventory.byStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}