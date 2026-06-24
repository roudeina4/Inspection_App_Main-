import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@shared/schema";
import heroImage from "@/assets/images/login-hero.jpg";
import tbaLogo from "@/assets/images/tba-logo.webp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, setDemoUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      await setDemoUser(role);
      const destination = role === "OWNER" ? "/owner" : (role === "PM" || role === "ADMIN") ? "/portal" : "/";
      window.location.href = destination;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Demo Login Failed",
        description: error instanceof Error ? error.message : "Could not access demo account",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute bottom-6 right-6 z-50">
        <img 
          src={tbaLogo} 
          alt="Toronto Boutique Apartments" 
          className="h-16 w-auto opacity-90"
          data-testid="img-tba-logo"
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center px-4 sm:px-8 lg:px-16">
        <div className="w-full max-w-lg lg:ml-[8%]">
          <Card className="shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-0 bg-white dark:bg-card">
            <CardHeader className="text-center pb-4 pt-8">
              <CardTitle className="text-3xl font-semibold tracking-tight">Welcome Back</CardTitle>
              <CardDescription className="text-base mt-2">Inspect and onboard new rental properties</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                    data-testid="input-password"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading} data-testid="button-login">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
                  Create one
                </Link>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-card px-3 text-muted-foreground font-medium">Demo Access</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin("ADMIN")}
                  disabled={isLoading}
                  data-testid="button-demo-admin"
                >
                  Admin Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin("PM")}
                  disabled={isLoading}
                  data-testid="button-demo-pm"
                >
                  PM Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin("CLEANER")}
                  disabled={isLoading}
                  data-testid="button-demo-cleaner"
                >
                  Cleaner Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin("INSPECTOR")}
                  disabled={isLoading}
                  data-testid="button-demo-inspector"
                >
                  Inspector Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin("OWNER")}
                  disabled={isLoading}
                  className="col-span-2 border-teal-200 text-teal-700 hover:bg-teal-50"
                  data-testid="button-demo-owner"
                >
                  Owner Demo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
