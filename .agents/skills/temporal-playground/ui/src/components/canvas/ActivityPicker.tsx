import { useEffect, useMemo, useState } from "react";

interface ActivityParam {
  name: string;
  type: string;
}

interface DiscoveredActivity {
  name: string;
  service: string;
  filePath: string;
  params: ActivityParam[];
  returnType: string;
  config?: {
    timeout?: string;
    maxAttempts?: number;
    backoffCoefficient?: number;
  };
}

interface ActivityPickerProps {
  onSelect: (activity: DiscoveredActivity) => void;
}

/**
 * Activity picker that fetches discovered activities from the server
 * and displays them grouped by service. When selected, it populates
 * the activity node with real data.
 */
export function ActivityPicker({ onSelect }: ActivityPickerProps) {
  const [activities, setActivities] = useState<DiscoveredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:4343/api/activities")
      .then((r) => r.json())
      .then((data) => {
        setActivities(data as DiscoveredActivity[]);
        setLoading(false);
      })
      .catch((_err) => {
        setError("Could not load activities");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return activities;
    const q = search.toLowerCase();
    return activities.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.service.toLowerCase().includes(q),
    );
  }, [activities, search]);

  // Group by service
  const grouped = useMemo(() => {
    const map = new Map<string, DiscoveredActivity[]>();
    for (const act of filtered) {
      const list = map.get(act.service) || [];
      list.push(act);
      map.set(act.service, list);
    }
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div className="px-3 py-2 text-[11px] text-white/30 italic">
        Loading activities...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 text-[11px] text-red-400/60 italic">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-white/30 italic">
        No activities found in the project.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
          Discovered Activities
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities..."
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
        />
      </div>

      <div className="flex max-h-[200px] flex-col gap-1.5 overflow-y-auto">
        {Array.from(grouped.entries()).map(([service, acts]) => (
          <div key={service}>
            <p className="mb-0.5 px-1 font-medium text-[9px] text-white/25 uppercase tracking-wider">
              {service}
            </p>
            {acts.map((act) => (
              <button
                key={`${act.service}-${act.name}`}
                type="button"
                className="group flex w-full flex-col rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.06]"
                onClick={() => onSelect(act)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium font-mono text-[11px] text-green-400/80 group-hover:text-green-400">
                    {act.name}
                  </span>
                  {act.config?.timeout && (
                    <span className="rounded bg-white/[0.04] px-1 text-[9px] text-white/20">
                      {act.config.timeout}
                    </span>
                  )}
                </div>
                <span className="truncate font-mono text-[10px] text-white/25">
                  ({act.params.map((p) => `${p.name}: ${p.type}`).join(", ")})
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
