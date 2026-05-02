import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, Code2, Mail, LayoutList, FileText, CreditCard, BarChart3, Database, Users, Package, TrendingUp, Wallet } from "lucide-react";
import fleurLogo from "@/assets/fleur-logo.png";

const Branding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background safe-area-inset px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate("/login")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
        </Button>

        {/* Hero */}
        <div className="bg-card comic-border rounded-2xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={fleurLogo}
              alt="Brand emblem"
              className="h-32 w-auto object-contain drop-shadow-[0_0_20px_hsl(280_75%_55%/0.5)]"
            />
          </div>
          <h1 className="font-comic text-4xl sm:text-5xl text-foreground">
            About the Website
          </h1>
          <p className="font-comic-body text-base text-muted-foreground max-w-xl mx-auto">
            A bold, paperless petrol pump management system — built with a
            retro-comic spirit and modern engineering.
          </p>
        </div>

        {/* Story Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-card comic-border rounded-xl p-5 space-y-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <h2 className="font-comic text-2xl">The Vision</h2>
            <p className="font-comic-body text-sm text-muted-foreground">
              Replace stacks of paper ledgers with a fast, reliable digital
              tracker that any team member can use confidently.
            </p>
          </div>

          <div className="bg-card comic-border rounded-xl p-5 space-y-2">
            <Heart className="h-6 w-6 text-destructive" />
            <h2 className="font-comic text-2xl">Made With Care</h2>
            <p className="font-comic-body text-sm text-muted-foreground">
              Designed for petrol pump dealers in Tamil Nadu, with attention to
              real workflows: shifts, attendance, debtors, and storage.
            </p>
          </div>

          <div className="bg-card comic-border rounded-xl p-5 space-y-2">
            <Code2 className="h-6 w-6 text-primary" />
            <h2 className="font-comic text-2xl">Built With</h2>
            <p className="font-comic-body text-sm text-muted-foreground">
              React, TypeScript, Tailwind CSS, and Lovable Cloud — secured with
              role-based access and multi-tenant isolation.
            </p>
          </div>

          <div className="bg-card comic-border rounded-xl p-5 space-y-2">
            <Mail className="h-6 w-6 text-secondary-foreground" />
            <h2 className="font-comic text-2xl">Get in Touch</h2>
            <p className="font-comic-body text-sm text-muted-foreground break-all">
              rkschouhan2012@gmail.com
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card comic-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LayoutList className="h-6 w-6 text-primary" />
            <h2 className="font-comic text-2xl">Content</h2>
          </div>
          <p className="font-comic-body text-sm text-muted-foreground">
            Everything this website helps you manage:
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 font-comic-body text-sm">
            {[
              { icon: FileText, label: "Daily Entry" },
              { icon: CreditCard, label: "Card Transaction Bills" },
              { icon: BarChart3, label: "Statistics" },
              { icon: Database, label: "All Data Dump" },
              { icon: Users, label: "Attendance" },
              { icon: Package, label: "Storage Products" },
              { icon: TrendingUp, label: "Graphical Trends" },
              { icon: Wallet, label: "Salary" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 bg-muted/40 rounded-lg p-2 border-2 border-foreground/10"
              >
                <Icon className="h-4 w-4 text-accent-foreground" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="bg-secondary comic-border rounded-xl p-5 text-center">
          <p className="font-comic text-xl text-secondary-foreground">
            POW! — Paperless. Powerful. Yours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Branding;
