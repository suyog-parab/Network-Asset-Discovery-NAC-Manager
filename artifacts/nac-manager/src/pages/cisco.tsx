import { useState } from "react";
import { useGenerateCiscoConfig } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CiscoConfig() {
  const [formData, setFormData] = useState({
    radiusServerIp: "",
    radiusSecret: "",
    guestVlanId: "99",
    quarantineVlanId: "999",
    enableDot1x: true,
    enableMab: true
  });
  
  const { toast } = useToast();
  
  const generateMutation = useGenerateCiscoConfig();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      data: {
        radiusServerIp: formData.radiusServerIp,
        radiusSecret: formData.radiusSecret,
        guestVlanId: parseInt(formData.guestVlanId),
        quarantineVlanId: parseInt(formData.quarantineVlanId),
        enableDot1x: formData.enableDot1x,
        enableMab: formData.enableMab
      }
    });
  };

  const copyToClipboard = () => {
    if (generateMutation.data?.config) {
      navigator.clipboard.writeText(generateMutation.data.config);
      toast({ title: "Config copied to clipboard" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Cisco Config Generator</h1>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Switch Settings</CardTitle>
            <CardDescription>Generate NAC configuration for Cisco IOS XE switches.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="radiusServerIp">RADIUS Server IP</Label>
                <Input 
                  id="radiusServerIp" 
                  required 
                  placeholder="192.168.1.10"
                  value={formData.radiusServerIp}
                  onChange={(e) => setFormData(prev => ({ ...prev, radiusServerIp: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radiusSecret">RADIUS Secret</Label>
                <Input 
                  id="radiusSecret" 
                  type="password" 
                  required
                  value={formData.radiusSecret}
                  onChange={(e) => setFormData(prev => ({ ...prev, radiusSecret: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestVlanId">Guest VLAN</Label>
                  <Input 
                    id="guestVlanId" 
                    type="number"
                    value={formData.guestVlanId}
                    onChange={(e) => setFormData(prev => ({ ...prev, guestVlanId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quarantineVlanId">Quarantine VLAN</Label>
                  <Input 
                    id="quarantineVlanId" 
                    type="number"
                    value={formData.quarantineVlanId}
                    onChange={(e) => setFormData(prev => ({ ...prev, quarantineVlanId: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-y">
                <Label htmlFor="enableDot1x" className="cursor-pointer">Enable 802.1X</Label>
                <Switch 
                  id="enableDot1x" 
                  checked={formData.enableDot1x}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, enableDot1x: c }))}
                />
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <Label htmlFor="enableMab" className="cursor-pointer">Enable MAB</Label>
                <Switch 
                  id="enableMab" 
                  checked={formData.enableMab}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, enableMab: c }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={generateMutation.isPending}>
                <Terminal className="mr-2 h-4 w-4" />
                Generate Configuration
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 bg-zinc-950 text-zinc-50 overflow-hidden flex flex-col">
          <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-zinc-400 font-mono">ios_xe_nac.cfg</span>
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-white" onClick={copyToClipboard} disabled={!generateMutation.data?.config}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 overflow-auto flex-1 h-[500px]">
            {generateMutation.isPending ? (
              <div className="flex items-center justify-center h-full text-zinc-500 font-mono animate-pulse">
                Generating config...
              </div>
            ) : generateMutation.data?.config ? (
              <pre className="font-mono text-sm leading-relaxed text-zinc-300">
                <code>{generateMutation.data.config}</code>
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono">
                <Terminal className="h-12 w-12 mb-4 opacity-50" />
                <p>Fill out the form and click generate</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}