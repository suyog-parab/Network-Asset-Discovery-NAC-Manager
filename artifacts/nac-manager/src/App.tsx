import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import DeviceDetail from "@/pages/device-detail";
import Quarantine from "@/pages/quarantine";
import Discovery from "@/pages/discovery";
import Vlans from "@/pages/vlans";
import Switches from "@/pages/switches";
import Sites from "@/pages/sites";
import Radius from "@/pages/radius";
import Policies from "@/pages/policies";
import Alerts from "@/pages/alerts";
import CiscoConfig from "@/pages/cisco";
import Reports from "@/pages/reports";
import Audit from "@/pages/audit";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/devices" component={Devices} />
        <Route path="/devices/:id" component={DeviceDetail} />
        <Route path="/quarantine" component={Quarantine} />
        <Route path="/discovery" component={Discovery} />
        <Route path="/vlans" component={Vlans} />
        <Route path="/switches" component={Switches} />
        <Route path="/sites" component={Sites} />
        <Route path="/radius" component={Radius} />
        <Route path="/policies" component={Policies} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/cisco" component={CiscoConfig} />
        <Route path="/reports" component={Reports} />
        <Route path="/audit" component={Audit} />
        <Route path="/users" component={Users} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;