import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FuelIcon, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Role = "Proprietor" | "Manager" | "Supervisor";

const ROLE_PASSWORDS: Record<Role, string> = {
  Supervisor: "MahaBunk",
  Manager: "Rajapalayam",
  Proprietor: "KRish",
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [password, setPassword] = useState("");
  const [showForgetDialog, setShowForgetDialog] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check if password matches the selected role
    if (password === ROLE_PASSWORDS[selectedRole]) {
      // Store role in sessionStorage
      sessionStorage.setItem("userRole", selectedRole);
      navigate("/");
    } else {
      toast({
        title: "Error",
        description: "Incorrect password for the selected role",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FuelIcon className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Petrol Pump Manager</h1>
          <p className="text-muted-foreground mt-2">Digital Sales Tracking System</p>
        </div>
        <div className="bg-card p-8 rounded-lg shadow-lg">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">Welcome Back</h2>
              <p className="text-sm text-muted-foreground mt-2">Login to your account</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Proprietor", "Manager", "Supervisor"] as Role[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                        selectedRole === role
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgetDialog(true)}
                className="text-sm text-primary hover:underline"
              >
                Forget detail
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showForgetDialog} onOpenChange={setShowForgetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Owner</DialogTitle>
            <DialogDescription>
              Please contact the owner for assistance with your account details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-lg font-medium text-foreground">+91 82487 60240</p>
            <Button onClick={() => setShowForgetDialog(false)} className="w-full">
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
