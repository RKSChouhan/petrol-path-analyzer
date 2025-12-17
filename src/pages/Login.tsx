import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FuelIcon, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [showRolePassword, setShowRolePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePassword, setRolePassword] = useState("");
  const [showForgetDialog, setShowForgetDialog] = useState(false);
  
  // Supabase auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    // Check existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user has a role already
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (roleData?.role) {
          sessionStorage.setItem("userRole", roleData.role);
          navigate("/");
        } else {
          setIsAuthenticated(true);
          setAuthUser({ id: session.user.id, email: session.user.email || "" });
        }
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        setAuthUser({ id: session.user.id, email: session.user.email || "" });
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    } else if (data.user) {
      // Check if user already has a role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roleData?.role) {
        sessionStorage.setItem("userRole", roleData.role);
        navigate("/");
      } else {
        setIsAuthenticated(true);
        setAuthUser({ id: data.user.id, email: data.user.email || "" });
      }
    }
    setLoading(false);
  };

  const handleRoleSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    if (rolePassword !== ROLE_PASSWORDS[selectedRole]) {
      toast({
        title: "Error",
        description: "Incorrect password for the selected role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (authUser) {
      // Save role to database
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: authUser.id,
          role: selectedRole,
        }, { onConflict: 'user_id,role' });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save role. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    sessionStorage.setItem("userRole", selectedRole);
    navigate("/");
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAuthUser(null);
    sessionStorage.removeItem("userRole");
  };

  // Show role selection after authentication
  if (isAuthenticated && authUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FuelIcon className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Select Your Role</h1>
            <p className="text-muted-foreground mt-2">Logged in as {authUser.email}</p>
          </div>
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <form onSubmit={handleRoleSelection} className="space-y-6">
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
                <Label htmlFor="rolePassword">Role Password</Label>
                <div className="relative">
                  <Input
                    id="rolePassword"
                    type={showRolePassword ? "text" : "password"}
                    placeholder="Enter role password"
                    value={rolePassword}
                    onChange={(e) => setRolePassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRolePassword(!showRolePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showRolePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Loading..." : "Continue"}
              </Button>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </form>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowForgetDialog(true)}
                className="text-sm text-primary hover:underline"
              >
                Forget role password?
              </button>
            </div>
          </div>
        </div>

        <Dialog open={showForgetDialog} onOpenChange={setShowForgetDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Owner</DialogTitle>
              <DialogDescription>
                Please contact the owner for assistance with role passwords.
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
  }

  // Show login/signup form
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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Welcome Back</h2>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
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
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center mt-6">
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
