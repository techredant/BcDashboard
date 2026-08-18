"use client";

import { useState } from "react";
import {
  Crown,
  Building2,
  Users2,
  Scale,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { LevelTabs } from "@/components/LevelTabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const positions = [
  { key: "all", label: "All", icon: Users2 },
  { key: "president", label: "President", icon: Crown },
  { key: "governor", label: "Governors", icon: Building2 },
  { key: "senator", label: "Senators", icon: Scale },
  { key: "mp", label: "MPs", icon: Users2 },
  { key: "mca", label: "MCAs", icon: MapPin },
];

const politicians = [
  {
    id: 1,
    name: "William Ruto",
    position: "president",
    county: "National",
    constituency: null as string | null,
    ward: null as string | null,
    party: "UDA",
    followers: 2400000,
    verified: true,
  },
  {
    id: 2,
    name: "Johnson Sakaja",
    position: "governor",
    county: "Nairobi",
    constituency: null,
    ward: null,
    party: "UDA",
    followers: 520000,
    verified: true,
  },
  {
    id: 3,
    name: "Edwin Sifuna",
    position: "senator",
    county: "Nairobi",
    constituency: null,
    ward: null,
    party: "ODM",
    followers: 190000,
    verified: true,
  },
  {
    id: 4,
    name: "Kimani Ichung'wah",
    position: "mp",
    county: "Kiambu",
    constituency: "Kikuyu",
    ward: null,
    party: "UDA",
    followers: 310000,
    verified: true,
  },
  {
    id: 5,
    name: "Jane Njeri",
    position: "mca",
    county: "Nairobi",
    constituency: "Dagoretti North",
    ward: "Kilimani Ward",
    party: "UDA",
    followers: 12000,
    verified: false,
  },
];

export default function PoliticiansPage() {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [constituencyFilter, setConstituencyFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");

  const counties = ["all", ...new Set(politicians.map((p) => p.county))];
  const constituencies = [
    "all",
    ...new Set(
      politicians
        .filter((p) => countyFilter === "all" || p.county === countyFilter)
        .map((p) => p.constituency)
        .filter(Boolean) as string[],
    ),
  ];
  const wards = [
    "all",
    ...new Set(
      politicians
        .filter(
          (p) =>
            (countyFilter === "all" || p.county === countyFilter) &&
            (constituencyFilter === "all" ||
              p.constituency === constituencyFilter),
        )
        .map((p) => p.ward)
        .filter(Boolean) as string[],
    ),
  ];

  const filtered = politicians.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchPos = posFilter === "all" || p.position === posFilter;
    const matchCounty = countyFilter === "all" || p.county === countyFilter;
    const matchConstituency =
      constituencyFilter === "all" || p.constituency === constituencyFilter;
    const matchWard = wardFilter === "all" || p.ward === wardFilter;
    return matchSearch && matchPos && matchCounty && matchConstituency && matchWard;
  });

  const formatFollowers = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(0)}K`
        : n.toString();

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Political Leaders"
        description="Browse and manage politician profiles on the mobile platform"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search leaders…"
          className="lg:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <Select value={countyFilter} onValueChange={(v) => { setCountyFilter(v); setConstituencyFilter("all"); setWardFilter("all"); }}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="County" /></SelectTrigger>
            <SelectContent>
              {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={constituencyFilter} onValueChange={(v) => { setConstituencyFilter(v); setWardFilter("all"); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Constituency" /></SelectTrigger>
            <SelectContent>
              {constituencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Ward" /></SelectTrigger>
            <SelectContent>
              {wards.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <LevelTabs options={positions} value={posFilter} onChange={setPosFilter} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((pol) => (
          <article key={pol.id} className="stat-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold font-display">{pol.name}</h3>
                <p className="text-xs capitalize text-muted-foreground">{pol.position}</p>
              </div>
              {pol.verified ? (
                <BadgeCheck className="h-5 w-5 shrink-0 text-success" />
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pol.county}
              {pol.constituency ? ` · ${pol.constituency}` : ""}
              {pol.ward ? ` · ${pol.ward}` : ""}
            </p>
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">{pol.party}</span>
              <span className="font-semibold">{formatFollowers(pol.followers)} followers</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
