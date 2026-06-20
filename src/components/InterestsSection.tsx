import SectionBlock from "@/components/SectionBlock";

const interests = [
  { name: "Running", detail: "Morning runs to think. Training for a half marathon." },
  { name: "Music", detail: "Listening, not playing. Playlists for deep work and long drives." },
  { name: "Design", detail: "How things look shapes how people feel. Details matter." },
  { name: "Writing", detail: "Thinking out loud. Mostly on Cleve." },
  { name: "Building in public", detail: "Sharing the process, not just the result." },
  { name: "Badminton", detail: "Competitive. Grew up playing in Sarawak." },
  { name: "Squash", detail: "Picked it up recently. Fast and punishing." },
];

const InterestsSection = () => {
  return (
    <SectionBlock id="interests" label="Interests">
      <div className="divide-y divide-border">
        {interests.map((item) => (
          <div
            key={item.name}
            className="flex items-baseline justify-between gap-6 py-3 first:pt-0 last:pb-0"
          >
            <span className="text-sm font-semibold text-foreground shrink-0">
              {item.name}
            </span>
            <span className="text-sm text-muted-foreground text-right">
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
};

export default InterestsSection;
