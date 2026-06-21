import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Global application settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input defaultValue="NAC Manager Production" />
              </div>
              <div className="space-y-2">
                <Label>Admin Contact Email</Label>
                <Input defaultValue="netops@company.local" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Device Expiration</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-purge dead devices</Label>
                  <p className="text-sm text-muted-foreground">Remove devices not seen in X days</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Retention period (days)</Label>
                <Input type="number" defaultValue="90" className="w-32" />
              </div>
            </div>

            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}