import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X, ArrowUpRight, Info, Map, List, SlidersHorizontal } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DEMO_ISSUES, STATUS_LABEL, ISSUE_CATEGORIES, getCategory, type DemoIssue } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { filterIssues, type IssueFilters } from "@/lib/issue-discovery";
import cityImage from "@/assets/civic-city.jpg";

function IssuePopup({ issue, onClose }: { issue: DemoIssue; onClose: () => void }) {
  const cat = getCategory(issue.category);
  const Icon = cat.icon;
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="dialog"
      aria-label={issue.title}
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-ink/10 bg-paper p-4 shadow-lift sm:left-auto sm:w-72"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            cat.tone,
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {cat.label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close details"
          className="h-6 w-6 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 font-display text-lg leading-snug">{issue.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {issue.locality} · {issue.reportedAgo}
      </p>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
        <span className="font-medium text-forest">{STATUS_LABEL[issue.status]}</span>
      </div>
    </motion.div>
  );
}

export function CityPreview({ showCta = true }: { showCta?: boolean }) {
  const [activeId, setActiveId] = useState<string | null>("NX-1042");
  const [filters, setFilters] = useState<IssueFilters>({query: "", category: "all", status: "all", sort: "default"});
  const [view, setView] = useState<"map" | "list">("map");
  const visible = useMemo(() => filterIssues(DEMO_ISSUES, filters), [filters]);
  const update = <K extends keyof IssueFilters>(key: K, value: IssueFilters[K]) => setFilters(previous => ({...previous,[key]:value}));
  const active = visible.find((i) => i.id === activeId) ?? null;

  return (
    <div className="grain relative overflow-hidden rounded-lg border border-ink/10 map-grid shadow-soft">
      <img src={cityImage} alt="Illustrative riverside neighbourhood" width={1920} height={1024} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="absolute inset-0 bg-forest/10" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 w-full max-w-xs items-center gap-2 rounded-full border border-ink/10 bg-paper px-4 py-2.5 shadow-soft">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search locality</span>
          <input
            value={filters.query}
            onChange={(e) => update("query", e.target.value)}
            placeholder="Search a locality, e.g. MG Road"
            className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
        <span className="flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" /> Illustrative preview · sample data
        </span>
      </div>

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap border-y border-paper/40 bg-paper/95 px-4 py-3">
        <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-forest sm:block" />
        <Select value={filters.category} onValueChange={value=>update("category",value as IssueFilters["category"])}><SelectTrigger aria-label="Filter category" className="w-full sm:w-36 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{ISSUE_CATEGORIES.map(c=><SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.status} onValueChange={value=>update("status",value as IssueFilters["status"])}><SelectTrigger aria-label="Filter status" className="w-full sm:w-32 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(STATUS_LABEL).map(([id,label])=><SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.sort} onValueChange={value=>update("sort",value as IssueFilters["sort"])}><SelectTrigger aria-label="Sort issues" className="w-full sm:w-36 bg-background text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="default">Default order</SelectItem><SelectItem value="locality">Locality A–Z</SelectItem></SelectContent></Select>
        <div className="ml-auto flex gap-1" aria-label="Issue view">{(["map","list"] as const).map(mode=><Button key={mode} variant={view===mode?"forest":"ghost"} size="icon" className="h-8 w-8 rounded-md" title={mode==="map"?"Map view":"List view"} aria-label={mode==="map"?"Map view":"List view"} aria-pressed={view===mode} onClick={()=>setView(mode)}>{mode==="map"?<Map />:<List />}</Button>)}</div>
        <span className="col-span-2 w-full text-[11px] text-muted-foreground" role="status">{visible.length} sample {visible.length===1?"report":"reports"}</span>
      </div>
      {view === "list" ? <div className="relative min-h-[400px] bg-paper/95 p-4">
        <ul className="divide-y divide-border">{visible.map(issue=>{const c=getCategory(issue.category);return <li key={issue.id}><Button variant="ghost" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-md py-4 text-left" onClick={()=>{setActiveId(issue.id);setView("map");}}><span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md",c.tone)}><c.icon /></span><span className="min-w-0 flex-1"><span className="block font-medium">{issue.title}</span><span className="mt-1 block text-xs text-muted-foreground">{issue.locality} · {issue.id}</span></span><span className="shrink-0 text-[10px] text-forest">{STATUS_LABEL[issue.status]}</span></Button></li>})}</ul>
        {visible.length===0 && <p className="py-16 text-center text-sm text-muted-foreground">No sample reports match these filters.</p>}
        <Button variant="link" onClick={()=>setFilters({query:"",category:"all",status:"all",sort:"default"})}>Reset filters</Button>
      </div> : <div className="relative h-[400px] md:h-[460px]">

        {visible.map((issue) => {
          const cat = getCategory(issue.category);
          const Icon = cat.icon;
          const isActive = issue.id === activeId;
          return (
            <Button
              variant="ghost"
              key={issue.id}
              onClick={() => setActiveId(isActive ? null : issue.id)}
              aria-label={`${issue.title}, ${issue.locality}`}
              aria-pressed={isActive}
              style={{ left: `${issue.x}%`, top: `${issue.y}%` }}
              className="group absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-0 hover:bg-transparent active:scale-100 focus-visible:outline-none"
            >
              {issue.status !== "resolved" && (
                <span
                  className="absolute inset-0 rounded-full bg-ember animate-marker-pulse"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-paper shadow-lift transition-transform duration-200 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  isActive ? "scale-115 bg-ink text-ink-foreground" : cat.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/90 px-2 py-0.5 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                {cat.label.split(" ")[0]}
              </span>
            </Button>
          );
        })}
        {visible.length === 0 && (
          <p className="absolute inset-x-4 top-1/3 rounded-lg bg-paper/95 p-4 text-center text-sm text-foreground shadow-soft">
            No sample reports match these filters.
          </p>
        )}
        <AnimatePresence>
          {active && (
            <IssuePopup key={active.id} issue={active} onClose={() => setActiveId(null)} />
          )}
        </AnimatePresence>
        {showCta && (
          <Button
            asChild
            variant="ink"
            className="absolute bottom-4 left-4 z-10 hidden sm:inline-flex"
          >
            <Link to="/explore">
              Open the city map <ArrowUpRight />
            </Link>
          </Button>
        )}
      </div>}
    </div>
  );
}
