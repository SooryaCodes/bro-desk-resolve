import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Shield, Zap } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            }
          },
        });

        if (error) throw error;

        // Auto login after signup
        if (data.session) {
          toast({
            title: "Account created!",
            description: "Welcome to BroDesk!",
          });
          navigate('/dashboard');
        } else {
          toast({
            title: "Account created!",
            description: "You can now sign in.",
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">BroDesk</h1>
          <p className="text-lg opacity-90">Raise. Track. Resolve. Learn Together.</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-background/10 rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">30-Second Submission</h3>
                <p className="opacity-80 text-sm">Quick complaint submission with automatic routing to the right team</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-background/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Transparent Tracking</h3>
                <p className="opacity-80 text-sm">Real-time status updates and complete visibility into resolution progress</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-background/10 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Full Accountability</h3>
                <p className="opacity-80 text-sm">Every issue documented, tracked, and assigned with clear responsibility</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm opacity-70">
          © 2025 BroDesk. Built for Brototype.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">BroDesk</h1>
            <p className="text-muted-foreground">Raise. Track. Resolve. Learn Together.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{isLogin ? 'Welcome back' : 'Get started'}</h2>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Sign in to access your dashboard' 
                : 'Create your account to start reporting issues'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@brototype.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="h-11"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </Button>

            <div className="text-center text-sm pt-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                disabled={loading}
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
