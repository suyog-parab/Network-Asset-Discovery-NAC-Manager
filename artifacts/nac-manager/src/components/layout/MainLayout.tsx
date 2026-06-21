import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Server, 
  ShieldAlert, 
  Search, 
  Network, 
  Router, 
  MapPin, 
  RadioReceiver, 
  ShieldCheck, 
  Bell, 
  Terminal, 
  FileBarChart, 
  History, 
  Users, 
  Settings,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/devices", label: "Inventory", icon: Server },
  { href: "/quarantine", label: "Quarantine", icon: ShieldAlert },
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/vlans", label: "VLANs", icon: Network },
  { href: "/switches", label: "Switches", icon: Router },
  { href: "/sites", label: "Sites", icon: MapPin },
  { href: "/radius", label: "FreeRADIUS", icon: RadioReceiver },
  { href: "/policies", label: "NAC Policies", icon: ShieldCheck },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/cisco", label: "Cisco Config", icon: Terminal },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/audit", label: "Audit Log", icon: History },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 w-full p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}>
            <span
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar h-screen sticky top-0">
        <div className="p-4 border-b h-14 flex items-center">
          <ShieldCheck className="h-6 w-6 text-primary mr-2" />
          <h1 className="font-bold text-lg tracking-tight truncate">NAC Manager</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background flex items-center px-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-4 border-b h-14 flex items-center">
              <ShieldCheck className="h-6 w-6 text-primary mr-2" />
              <h1 className="font-bold text-lg tracking-tight">NAC Manager</h1>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-3.5rem)]">
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-bold">NAC Manager</span>
      </div>
    </>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col md:pt-0 pt-14 max-w-full overflow-hidden">
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}