import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">BroDesk</h1>
          <Button onClick={() => navigate('/auth')} variant="outline">
            Sign in
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-left">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Raise. Track. Resolve.
                <br />
                <span className="text-muted-foreground">Learn Together.</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                BroDesk is Brototype's transparent student issue management system. 
                Every concern is heard, assigned to the right team, and resolved with complete transparency.
              </p>
              <div className="flex gap-4">
                <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Team collaboration" 
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3 text-left p-6 border border-border rounded-lg hover:bg-muted/30 transition-colors">
              <Zap className="h-10 w-10" />
              <h3 className="text-xl font-semibold">30-Second Submission</h3>
              <p className="text-muted-foreground text-sm">
                Quick and easy complaint submission with automatic routing to the right team
              </p>
            </div>

            <div className="space-y-3 text-left p-6 border border-border rounded-lg hover:bg-muted/30 transition-colors">
              <CheckCircle2 className="h-10 w-10" />
              <h3 className="text-xl font-semibold">Transparent Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Real-time status updates and clear visibility into resolution progress
              </p>
            </div>

            <div className="space-y-3 text-left p-6 border border-border rounded-lg hover:bg-muted/30 transition-colors">
              <Shield className="h-10 w-10" />
              <h3 className="text-xl font-semibold">Accountability</h3>
              <p className="text-muted-foreground text-sm">
                Every issue is documented, tracked, and assigned with clear responsibility
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 BroDesk. Built for Brototype learning environment.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
