import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import SiteNav from "@/components/SiteNav";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/reps");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/reps");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <SiteNav />
      <main className="px-6 md:px-12 lg:px-20 max-w-3xl mx-auto pb-20 pt-12">
        <section className="pt-24 md:pt-32 flex flex-col items-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            Sign in to Reps
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mb-8">
            Track your writing drills, get AI coaching feedback, and build your reps over time.
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center gap-3 border border-border hover:border-primary/40 rounded-sm px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          {error && (
            <p className="text-destructive text-xs mt-4">{error}</p>
          )}

          <p className="text-muted-foreground text-xs mt-8 font-mono">
            Your writing stays yours. We only track drill metrics.
          </p>
        </section>
      </main>
    </>
  );
};

export default Login;
