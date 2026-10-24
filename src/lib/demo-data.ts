/**
 * DEMONSTRATION DATA — illustrative only, not real civic records.
 * Replace these exports with database queries in a later phase
 * (see src/lib/data/issues.ts).
 */
import type { LucideIcon } from "lucide-react";
import {
  Construction,
  Trash2,
  Lightbulb,
  Droplets,
  Waves,
  Landmark,
  CircleHelp,
} from "lucide-react";

export type IssueCategoryId =
  "roads" | "garbage" | "streetlight" | "water" | "drainage" | "infrastructure" | "other";

export type IssueStatus = "reported" | "in_review" | "in_progress" | "resolved";

export interface IssueCategory {
  id: IssueCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes built from design tokens */
  tone: string;
}

export interface DemoIssue {
  id: string;
  title: string;
  category: IssueCategoryId;
  status: IssueStatus;
  locality: string;
  reportedAgo: string;
  /** position on the illustrative map, in percent */
  x: number;
  y: number;
}

export const ISSUE_CATEGORIES: IssueCategory[] = [
  {
    id: "roads",
    label: "Roads & potholes",
    description: "Cracks, potholes and damaged road surfaces.",
    icon: Construction,
    tone: "bg-peach text-ink",
  },
  {
    id: "garbage",
    label: "Garbage",
    description: "Overflowing bins and uncollected waste.",
    icon: Trash2,
    tone: "bg-sage text-forest",
  },
  {
    id: "streetlight",
    label: "Streetlights",
    description: "Broken, flickering or missing lights.",
    icon: Lightbulb,
    tone: "bg-ink text-ink-foreground",
  },
  {
    id: "water",
    label: "Water leakage",
    description: "Burst pipes and leaking supply lines.",
    icon: Droplets,
    tone: "bg-paper text-forest",
  },
  {
    id: "drainage",
    label: "Drainage",
    description: "Blocked drains and waterlogging.",
    icon: Waves,
    tone: "bg-forest text-forest-foreground",
  },
  {
    id: "infrastructure",
    label: "Public infrastructure",
    description: "Benches, footpaths, signage, parks.",
    icon: Landmark,
    tone: "bg-ember text-ember-foreground",
  },
  {
    id: "other",
    label: "Something else",
    description: "Any other civic problem nearby.",
    icon: CircleHelp,
    tone: "bg-muted text-ink",
  },
];

const OTHER = ISSUE_CATEGORIES.find((c) => c.id === "other") as IssueCategory;
export const getCategory = (id: IssueCategoryId): IssueCategory =>
  ISSUE_CATEGORIES.find((c) => c.id === id) ?? OTHER;

export const STATUS_LABEL: Record<IssueStatus, string> = {
  reported: "Reported",
  in_review: "In review",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const DEMO_ISSUES: DemoIssue[] = [
  {
    id: "NX-1042",
    title: "Deep pothole near bus stop",
    category: "roads",
    status: "in_progress",
    locality: "MG Road",
    reportedAgo: "2 days ago",
    x: 28,
    y: 38,
  },
  {
    id: "NX-1043",
    title: "Garbage pile beside market",
    category: "garbage",
    status: "reported",
    locality: "Sadar Bazaar",
    reportedAgo: "5 hours ago",
    x: 62,
    y: 24,
  },
  {
    id: "NX-1044",
    title: "Streetlight out for a week",
    category: "streetlight",
    status: "resolved",
    locality: "Gandhi Nagar",
    reportedAgo: "9 days ago",
    x: 74,
    y: 62,
  },
  {
    id: "NX-1045",
    title: "Pipeline leaking onto road",
    category: "water",
    status: "in_review",
    locality: "Civil Lines",
    reportedAgo: "1 day ago",
    x: 40,
    y: 70,
  },
  {
    id: "NX-1046",
    title: "Drain overflow after rain",
    category: "drainage",
    status: "reported",
    locality: "Rajpur",
    reportedAgo: "3 hours ago",
    x: 18,
    y: 64,
  },
];
