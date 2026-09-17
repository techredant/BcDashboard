"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PageLoading } from "@/components/PageLoading";
import { adminGet, adminPatch, adminPost } from "@/lib/adminClient";

type Source = {
  _id: string;
  name: string;
  url: string;
  countryCode?: string;
  sourceType: string;
  reliabilityScore: number;
  active: boolean;
};

type Story = {
  _id: string;
  headline: string;
  status: string;
  alertLevel: string;
  sourceCount: number;
  published: boolean;
};

type Weights = {
  publicImpact: number;
  recency: number;
  sourceReliability: number;
  geographicRelevance: number;
  storyVelocity: number;
  userInterest: number;
};

export default function NewsAdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [sourceType, setSourceType] = useState("established_media");

  async function load() {
    setLoading(true);
    try {
      const [s, st, sc] = await Promise.all([
        adminGet<Source[]>("/api/admin/news/sources"),
        adminGet<Story[]>("/api/admin/news/stories"),
        adminGet<{ weights: Weights }>("/api/admin/news/scoring"),
      ]);
      setSources(Array.isArray(s) ? s : []);
      setStories(Array.isArray(st) ? st : []);
      setWeights(sc?.weights || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="News intelligence"
        description="Sources, clusters, scoring, and breaking flags. Source reliability is not account verification."
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Add source</h2>
        <div className="flex flex-wrap gap-2">
          <input className="rounded border px-2 py-1" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="RSS URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="w-24 rounded border px-2 py-1" placeholder="ISO" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
          <select className="rounded border px-2 py-1" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            <option value="established_media">Established media</option>
            <option value="international_media">International media</option>
            <option value="official_government">Official government</option>
            <option value="local_media">Local media</option>
            <option value="social_media">Social media</option>
          </select>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1 text-primary-foreground"
            onClick={async () => {
              await adminPost("/api/admin/news/sources", {
                name,
                url,
                countryCode,
                sourceType,
                reliabilityScore: 70,
                active: true,
              });
              setName("");
              setUrl("");
              void load();
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border px-3 py-1"
            onClick={async () => {
              await adminPost("/api/admin/news/ingest-all");
              void load();
            }}
          >
            Queue ingest
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Sources</h2>
        <ul className="divide-y">
          {sources.map((s) => (
            <li key={s._id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {s.name} · {s.countryCode} · {s.sourceType} · {s.reliabilityScore}
              </span>
              <button
                type="button"
                className="text-primary"
                onClick={async () => {
                  await adminPost(`/api/admin/news/sources/${s._id}/ingest`);
                  void load();
                }}
              >
                Ingest
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Stories</h2>
        <ul className="space-y-2">
          {stories.map((st) => (
            <li key={st._id} className="rounded border p-3 text-sm">
              <p className="font-medium">{st.headline}</p>
              <p className="text-muted-foreground">
                {st.status} · {st.alertLevel} · {st.sourceCount} sources
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await adminPatch(`/api/admin/news/stories/${st._id}`, {
                      alertLevel: "critical",
                    });
                    void load();
                  }}
                >
                  Mark critical
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await adminPatch(`/api/admin/news/stories/${st._id}`, {
                      status: "disputed",
                    });
                    void load();
                  }}
                >
                  Disputed
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {weights ? (
        <section>
          <h2 className="text-lg font-semibold">Scoring weights</h2>
          <pre className="rounded bg-muted p-3 text-xs">{JSON.stringify(weights, null, 2)}</pre>
        </section>
      ) : null}
    </div>
  );
}
