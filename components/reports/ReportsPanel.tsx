"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Loader2, Send, Save, Clock,
  BarChart3, TrendingUp, TrendingDown, Eye, Heart, MessageSquare,
  Users, MousePointer, Share2, Bookmark, Play,
  CheckCircle2, ArrowLeft, ExternalLink, Calendar, Link2,
} from "lucide-react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import type { ReportPlatform, ReportContentType } from "@/lib/supabase/types";

/* ---------- Types ---------- */

interface ClientOption {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

interface ReportRow {
  id: string;
  client_id: string;
  script_id: string | null;
  platform: string | null;
  content_type: string | null;
  content_title: string | null;
  post_url: string | null;
  post_date: string | null;
  metrics: Record<string, number>;
  previous_metrics: Record<string, number> | null;
  generated_summary: string | null;
  recommendations: string | null;
  sent_at: string | null;
  created_at: string;
  client: { name: string; email: string; company: string | null };
}

interface ReportsPanelProps {
  clients: ClientOption[];
  initialReports: ReportRow[];
}

/* ---------- Constants ---------- */

const PLATFORMS: ReportPlatform[] = ["Instagram", "YouTube", "LinkedIn", "TikTok"];
const CONTENT_TYPES: ReportContentType[] = ["Video", "Photo", "Carousel", "Story", "Reel", "Post"];

const PLATFORM_METRICS: Record<ReportPlatform, { key: string; label: string; icon: typeof Eye }[]> = {
  Instagram: [
    { key: "views", label: "Views", icon: Eye },
    { key: "reach", label: "Reach", icon: Users },
    { key: "likes", label: "Likes", icon: Heart },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "shares", label: "Shares", icon: Share2 },
    { key: "saves", label: "Saves", icon: Bookmark },
    { key: "engagement_rate", label: "Engagement Rate (%)", icon: TrendingUp },
  ],
  TikTok: [
    { key: "views", label: "Views", icon: Eye },
    { key: "reach", label: "Reach", icon: Users },
    { key: "likes", label: "Likes", icon: Heart },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "shares", label: "Shares", icon: Share2 },
    { key: "saves", label: "Saves", icon: Bookmark },
    { key: "engagement_rate", label: "Engagement Rate (%)", icon: TrendingUp },
  ],
  YouTube: [
    { key: "views", label: "Views", icon: Eye },
    { key: "watch_time", label: "Watch Time (hrs)", icon: Clock },
    { key: "likes", label: "Likes", icon: Heart },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "subscribers_gained", label: "Subscribers Gained", icon: Users },
    { key: "ctr", label: "CTR (%)", icon: MousePointer },
  ],
  LinkedIn: [
    { key: "impressions", label: "Impressions", icon: Eye },
    { key: "clicks", label: "Clicks", icon: MousePointer },
    { key: "likes", label: "Likes", icon: Heart },
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "reposts", label: "Reposts", icon: Share2 },
    { key: "ctr", label: "CTR (%)", icon: MousePointer },
    { key: "engagement_rate", label: "Engagement Rate (%)", icon: TrendingUp },
  ],
};

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "instagram.com",
  YouTube: "youtube.com",
  LinkedIn: "linkedin.com",
  TikTok: "tiktok.com",
};

const METRIC_ICON_MAP: Record<string, typeof Eye> = {
  views: Eye, reach: Users, likes: Heart, comments: MessageSquare,
  shares: Share2, saves: Bookmark, engagement_rate: TrendingUp,
  watch_time: Clock, subscribers_gained: Users, ctr: MousePointer,
  impressions: Eye, clicks: MousePointer, reposts: Share2,
};

/* ---------- Helpers ---------- */

function formatMetricValue(key: string, value: number): string {
  if (key.includes("rate") || key === "ctr") return `${value}%`;
  return value.toLocaleString();
}

function calcChange(current: number, previous: number): { pct: number; direction: "up" | "down" | "flat" } {
  if (current === previous) return { pct: 0, direction: "flat" };
  const pct = previous !== 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  return { pct, direction: current > previous ? "up" : "down" };
}

function parseSummaryParts(summary: string): { overview: string; comparison: string } {
  const parts = summary.split("\n\n---COMPARISON---\n");
  return { overview: parts[0] ?? summary, comparison: parts[1] ?? "" };
}

/* ---------- Component ---------- */

export default function ReportsPanel({ clients, initialReports }: ReportsPanelProps) {
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportRow[]>(initialReports);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id ?? "");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Form
  const [contentTitle, setContentTitle] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [postDate, setPostDate] = useState("");
  const [platform, setPlatform] = useState<ReportPlatform>("Instagram");
  const [contentType, setContentType] = useState<ReportContentType>("Video");
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [comparePrevious, setComparePrevious] = useState(false);
  const [prevMetrics, setPrevMetrics] = useState<Record<string, string>>({});

  // Actions
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  // Generated output
  const [generatedOutput, setGeneratedOutput] = useState<{
    id: string;
    overview: string;
    comparison: string;
    recommendations: string;
  } | null>(null);

  // Derived
  const clientReports = useMemo(
    () => reports.filter((r) => r.client_id === selectedClientId),
    [reports, selectedClientId]
  );
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const currentMetricFields = PLATFORM_METRICS[platform] ?? [];

  const viewingReport = selectedReportId ? reports.find((r) => r.id === selectedReportId) : null;

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    setSelectedReportId(null);
    setGeneratedOutput(null);
    resetForm();
  }

  function resetForm() {
    setContentTitle("");
    setPostUrl("");
    setPostDate("");
    setPlatform("Instagram");
    setContentType("Video");
    setMetrics({});
    setComparePrevious(false);
    setPrevMetrics({});
    setGeneratedOutput(null);
  }

  function handleNewReport() {
    setSelectedReportId(null);
    setGeneratedOutput(null);
    resetForm();
  }

  function handleViewReport(report: ReportRow) {
    setSelectedReportId(report.id);
    if (report.generated_summary) {
      const { overview, comparison } = parseSummaryParts(report.generated_summary);
      setGeneratedOutput({
        id: report.id,
        overview,
        comparison,
        recommendations: report.recommendations ?? "",
      });
    } else {
      setGeneratedOutput(null);
    }
    setContentTitle(report.content_title ?? "");
    setPostUrl(report.post_url ?? "");
    setPostDate(report.post_date ?? "");
    setPlatform((report.platform as ReportPlatform) ?? "Instagram");
    setContentType((report.content_type as ReportContentType) ?? "Video");
    const ms: Record<string, string> = {};
    for (const [k, v] of Object.entries(report.metrics)) ms[k] = String(v);
    setMetrics(ms);
    if (report.previous_metrics && Object.keys(report.previous_metrics).length > 0) {
      setComparePrevious(true);
      const pm: Record<string, string> = {};
      for (const [k, v] of Object.entries(report.previous_metrics)) pm[k] = String(v);
      setPrevMetrics(pm);
    } else {
      setComparePrevious(false);
      setPrevMetrics({});
    }
  }

  function buildNumericMetrics(): Record<string, number> | null {
    const result: Record<string, number> = {};
    for (const field of currentMetricFields) {
      const val = parseFloat(metrics[field.key] ?? "0");
      if (isNaN(val)) {
        toast("error", `Invalid value for ${field.label}`);
        return null;
      }
      result[field.key] = val;
    }
    return result;
  }

  function buildPrevNumericMetrics(): Record<string, number> | null {
    if (!comparePrevious) return null;
    const result: Record<string, number> = {};
    for (const field of currentMetricFields) {
      const val = parseFloat(prevMetrics[field.key] ?? "0");
      if (isNaN(val)) {
        toast("error", `Invalid previous value for ${field.label}`);
        return null;
      }
      result[field.key] = val;
    }
    return result;
  }

  async function handleSave() {
    if (!contentTitle.trim()) { toast("error", "Content title is required"); return; }
    const numMetrics = buildNumericMetrics();
    if (!numMetrics) return;
    const numPrev = comparePrevious ? buildPrevNumericMetrics() : null;
    if (comparePrevious && !numPrev) return;

    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          platform,
          content_type: contentType,
          content_title: contentTitle.trim(),
          post_url: postUrl.trim() || null,
          post_date: postDate || null,
          metrics: numMetrics,
          previous_metrics: numPrev,
        }),
      });
      if (!res.ok) { const e = await res.json(); toast("error", e.error ?? "Save failed"); return; }
      const { report } = await res.json();
      const newReport: ReportRow = {
        ...report,
        client: selectedClient ? { name: selectedClient.name, email: selectedClient.email, company: selectedClient.company } : { name: "", email: "", company: null },
      };
      setReports((prev) => [newReport, ...prev]);
      setSelectedReportId(report.id);
      toast("success", "Report saved");
    } catch { toast("error", "Something went wrong"); } finally { setSaving(false); }
  }

  async function handleGenerate() {
    if (!contentTitle.trim()) { toast("error", "Content title is required"); return; }
    const numMetrics = buildNumericMetrics();
    if (!numMetrics) return;
    const numPrev = comparePrevious ? buildPrevNumericMetrics() : null;
    if (comparePrevious && !numPrev) return;

    setSaving(true);
    try {
      // Save first if no report selected or creating new
      let reportId = selectedReportId;
      if (!reportId) {
        const saveRes = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: selectedClientId,
            platform,
            content_type: contentType,
            content_title: contentTitle.trim(),
            post_url: postUrl.trim() || null,
            post_date: postDate || null,
            metrics: numMetrics,
            previous_metrics: numPrev,
          }),
        });
        if (!saveRes.ok) { const e = await saveRes.json(); toast("error", e.error ?? "Save failed"); return; }
        const { report } = await saveRes.json();
        reportId = report.id as string;
        const newReport: ReportRow = {
          ...report,
          client: selectedClient ? { name: selectedClient.name, email: selectedClient.email, company: selectedClient.company } : { name: "", email: "", company: null },
        };
        setReports((prev) => [newReport, ...prev]);
        setSelectedReportId(reportId);
      }

      setSaving(false);
      setGenerating(true);

      const genRes = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!genRes.ok) { const e = await genRes.json(); toast("error", e.error ?? "Generation failed"); return; }
      const { overview, comparison, recommendations } = await genRes.json();

      setGeneratedOutput({ id: reportId!, overview, comparison, recommendations });

      const fullSummary = comparison ? `${overview}\n\n---COMPARISON---\n${comparison}` : overview;
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, generated_summary: fullSummary, recommendations } : r
        )
      );
      toast("success", "Report generated");
    } catch { toast("error", "Something went wrong"); } finally { setSaving(false); setGenerating(false); }
  }

  async function handleSendEmail(reportId: string) {
    setSending(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) { const e = await res.json(); toast("error", e.error ?? "Failed to send"); return; }
      toast("success", "Report emailed to client");
      setReports((prev) =>
        prev.map((r) => r.id === reportId ? { ...r, sent_at: new Date().toISOString() } : r)
      );
    } catch { toast("error", "Failed to send email"); } finally { setSending(false); }
  }

  /* ---------- Render ---------- */

  const isViewingGenerated = viewingReport?.generated_summary && generatedOutput;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 min-h-[calc(100vh-65px)]">
      {/* ===== LEFT PANEL ===== */}
      <div className="border-r border-[var(--border)] bg-[var(--card)]/50 flex flex-col">
        {/* Client Selector */}
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2">Client</p>
          <div className="relative">
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full appearance-none px-3 py-2.5 pr-8 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent cursor-pointer"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
          </div>
        </div>

        {/* New Report */}
        <div className="p-4 border-b border-[var(--border)]">
          <button
            onClick={handleNewReport}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors",
              !selectedReportId
                ? "bg-[var(--accent-primary)] text-white"
                : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
            )}
          >
            <BarChart3 size={13} />
            New Report
          </button>
        </div>

        {/* Report History */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3">
              History ({clientReports.length})
            </p>
            {clientReports.length === 0 ? (
              <p className="text-xs text-[var(--muted)] opacity-60">No reports yet for this client.</p>
            ) : (
              <div className="space-y-2">
                {clientReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => handleViewReport(report)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedReportId === report.id
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                        : "border-[var(--border)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--surface-elevated)]"
                    )}
                  >
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {report.content_title ?? "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {report.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
                          {report.platform}
                        </span>
                      )}
                      {report.post_date && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--muted)] opacity-60">
                          <Calendar size={9} />
                          {new Date(report.post_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className="ml-auto shrink-0">
                        {report.sent_at ? (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--accent-success)]">
                            <CheckCircle2 size={10} />
                            Sent
                          </span>
                        ) : report.generated_summary ? (
                          <span className="text-[10px] text-amber-400">Draft</span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted)] opacity-40">Saved</span>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="flex flex-col overflow-y-auto">
        <AnimatePresence mode="wait">
          {isViewingGenerated && generatedOutput ? (
            /* ---------- GENERATED REPORT VIEW ---------- */
            <motion.div
              key={`view-${generatedOutput.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              {/* Header */}
              <div>
                <button
                  onClick={handleNewReport}
                  className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-3"
                >
                  <ArrowLeft size={12} />
                  New report
                </button>
                <h2 className="text-lg font-semibold text-[var(--text)]">{viewingReport!.content_title}</h2>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
                    {viewingReport!.platform}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)]">
                    {viewingReport!.content_type}
                  </span>
                  <span className="text-xs text-[var(--muted)]">for {viewingReport!.client.name}</span>
                  {viewingReport!.post_date && (
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Calendar size={11} />
                      {new Date(viewingReport!.post_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
                {viewingReport!.post_url && (
                  <a
                    href={viewingReport!.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    <ExternalLink size={11} />
                    View on {viewingReport!.platform}
                  </a>
                )}
              </div>

              {/* Metrics Grid with WoW */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3">Metrics</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(viewingReport!.metrics).map(([key, value]) => {
                    const IconComp = METRIC_ICON_MAP[key] ?? BarChart3;
                    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    const prev = viewingReport!.previous_metrics?.[key];
                    const change = prev !== undefined ? calcChange(value, prev) : null;

                    return (
                      <div key={key} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComp size={13} className="text-[var(--muted)]" />
                          <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] opacity-60">{label}</span>
                        </div>
                        <p className="text-xl font-semibold text-[var(--text)]">
                          {formatMetricValue(key, value)}
                        </p>
                        {change && change.direction !== "flat" && (
                          <div className={cn("flex items-center gap-1 mt-1.5 text-[11px] font-medium", change.direction === "up" ? "text-emerald-400" : "text-red-400")}>
                            {change.direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {change.direction === "up" ? "+" : ""}{change.pct}% vs last period
                          </div>
                        )}
                        {change && change.direction === "flat" && (
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[var(--muted)] opacity-50">
                            No change
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Overview */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] mb-3 font-semibold">Performance Overview</p>
                <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{generatedOutput.overview}</p>
              </div>

              {/* Week-on-Week Comparison */}
              {generatedOutput.comparison && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] mb-3 font-semibold">Week-on-Week Comparison</p>
                  <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{generatedOutput.comparison}</p>
                </div>
              )}

              {/* Recommendations */}
              {generatedOutput.recommendations && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] mb-3 font-semibold">Recommendations</p>
                  <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{generatedOutput.recommendations}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => handleSendEmail(generatedOutput.id)}
                  disabled={sending || !!viewingReport!.sent_at}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    viewingReport!.sent_at
                      ? "bg-[var(--surface-elevated)] text-[var(--muted)] border border-[var(--border)]"
                      : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary"
                  )}
                >
                  {sending ? <Loader2 size={12} className="animate-spin" /> : viewingReport!.sent_at ? <CheckCircle2 size={12} /> : <Send size={12} />}
                  {viewingReport!.sent_at ? "Sent to Client" : "Email to Client"}
                </button>
                {viewingReport!.sent_at && (
                  <span className="text-[10px] text-[var(--muted)] opacity-50">
                    Sent {formatTimeAgo(viewingReport!.sent_at)}
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            /* ---------- FORM ---------- */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-6 space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  New Report
                  {selectedClient && (
                    <span className="text-[var(--muted)] font-normal text-sm ml-2">
                      for {selectedClient.name}
                    </span>
                  )}
                </h2>
              </div>

              {/* Content Title */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 block">Content Title</label>
                <input
                  type="text"
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  placeholder="e.g. Behind the Scenes at the Studio"
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                />
              </div>

              {/* Post URL + Post Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 block">Post URL</label>
                  <div className="relative">
                    <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] opacity-50" />
                    <input
                      type="url"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      placeholder="https://instagram.com/p/..."
                      className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 block">Post Date</label>
                  <input
                    type="date"
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent cursor-pointer"
                  />
                </div>
              </div>

              {/* Platform + Content Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 block">Platform</label>
                  <div className="relative">
                    <select
                      value={platform}
                      onChange={(e) => { setPlatform(e.target.value as ReportPlatform); setMetrics({}); setPrevMetrics({}); }}
                      className="w-full appearance-none px-3 py-2.5 pr-8 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent cursor-pointer"
                    >
                      {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 block">Content Type</label>
                  <div className="relative">
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value as ReportContentType)}
                      className="w-full appearance-none px-3 py-2.5 pr-8 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent cursor-pointer"
                    >
                      {CONTENT_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Current Metrics */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3 block">
                  Metrics — {platform}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentMetricFields.map((field) => (
                    <div key={field.key}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <field.icon size={11} className="text-[var(--muted)]" />
                        <label className="text-[11px] text-[var(--muted)]">{field.label}</label>
                      </div>
                      <input
                        type="number"
                        step={field.key.includes("rate") || field.key === "ctr" ? "0.01" : "1"}
                        value={metrics[field.key] ?? ""}
                        onChange={(e) => setMetrics((p) => ({ ...p, [field.key]: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Compare Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setComparePrevious(!comparePrevious)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    comparePrevious ? "bg-[var(--accent-primary)]" : "bg-[var(--border)]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                      comparePrevious ? "translate-x-[18px]" : "translate-x-[3px]"
                    )}
                  />
                </button>
                <span className="text-xs text-[var(--text)]">Compare with previous period</span>
              </div>

              {/* Previous Period Metrics */}
              <AnimatePresence>
                {comparePrevious && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-3 block">
                      Last Period Metrics
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {currentMetricFields.map((field) => (
                        <div key={`prev-${field.key}`}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <field.icon size={11} className="text-[var(--muted)] opacity-50" />
                            <label className="text-[11px] text-[var(--muted)] opacity-70">{field.label}</label>
                          </div>
                          <input
                            type="number"
                            step={field.key.includes("rate") || field.key === "ctr" ? "0.01" : "1"}
                            value={prevMetrics[field.key] ?? ""}
                            onChange={(e) => setPrevMetrics((p) => ({ ...p, [field.key]: e.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm text-[var(--text)] opacity-80 placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={saving || generating || !contentTitle.trim()}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 glow-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : generating ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Play size={14} /> Generate Report</>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || generating || !contentTitle.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={13} />
                  Save Only
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
