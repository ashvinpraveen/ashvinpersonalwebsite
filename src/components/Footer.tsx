const Footer = () => {
  return (
    <footer className="pt-8 pb-12 border-t border-border">
      <p className="font-mono text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ashvin Praveen
      </p>
    </footer>
  );
};

export default Footer;
