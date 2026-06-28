type FeatureUnavailableProps = {
  title: string;
  description: string;
};

export default function FeatureUnavailable({
  title,
  description,
}: FeatureUnavailableProps) {
  return (
    <div className="rounded-[8px] border border-border bg-card p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Optional feature
      </p>
      <h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
