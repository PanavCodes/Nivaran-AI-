"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, PieChart } from "lucide-react";
import { api } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/types";
import { Skeleton } from "@/components/ui/progress";

interface Trends {
  volume: { date: string; count: number }[];
  categories: { category: string; count: number }[];
}

const ACCENT = "#4f46e5";
const SECONDARY = "#0284c7";

export function AnalyticsCharts({ refreshToken }: { refreshToken?: number }) {
  const [trends, setTrends] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get<Trends>("/api/v1/admin/trends")
      .then((t) => alive && setTrends(t))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  if (loading) {
    return (
      <div className="grid gap-3 p-3 md:grid-cols-3">
        <Skeleton className="h-44 md:col-span-2" />
        <Skeleton className="h-44" />
      </div>
    );
  }
  if (!trends) return null;

  const radarData = trends.categories.map((c) => ({
    category: CATEGORY_LABELS[c.category] ?? c.category,
    count: c.count,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:col-span-2"
      >
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Activity size={13} className="text-indigo-600" /> Incident Volume (Last 14 Days)
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends.volume} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
                stroke="#e2e8f0"
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} stroke="#e2e8f0" />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#0f172a",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                labelStyle={{ color: "#475569", fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Reports"
                stroke={ACCENT}
                strokeWidth={2}
                fill="url(#volFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <PieChart size={13} className="text-sky-600" /> Category Breakdown
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 500 }} />
              <PolarRadiusAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} />
              <Radar
                name="Clusters"
                dataKey="count"
                stroke={SECONDARY}
                fill={SECONDARY}
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#0f172a",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
