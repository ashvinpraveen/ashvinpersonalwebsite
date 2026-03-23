import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

const SiteNav = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<boolean>(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(!!session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-3xl mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between h-12">
        <Link to="/" className="font-semibold text-sm tracking-tight text-foreground hover:text-primary transition-colors">
          AP
        </Link>
        <div className="flex items-center gap-6 font-mono text-xs">
          <a href="https://linkedin.com/in/ashvinpraveen" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            LinkedIn
          </a>
          <a href="https://instagram.com/ashvinpraveen" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            Instagram
          </a>
          <a href="https://x.com/ashvinpk" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            X
          </a>
          <a href="https://youtube.com/@ashvinpraveen" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            YouTube
          </a>
          <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            Writing
          </Link>
          <Link to="/reps" className="text-muted-foreground hover:text-foreground transition-colors">
            Reps
          </Link>
          {user ? (
            <button onClick={handleSignOut} className="text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          ) : (
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};

export default SiteNav;
