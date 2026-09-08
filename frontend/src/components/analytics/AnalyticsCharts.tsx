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

const ACCENT = "#58a6ff";
const HIGH = "#ffcc00";

/**
 * Campus-wide trend analytics — Recharts AreaChart (issue volume over the
 * last 14 days) and RadarChart (category breakdown), per BUILD.md §2.4 and
 * the abstract's "Analytics for identifying campus-wide trends".
 */
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
    <div className="grid gap-px bg-[#21262d] md:grid-cols-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0d1117] p-4 md:col-span-2"
      >
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
          <Activity size={12} className="text-accent" /> Issue volume — last 14 days
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends.volume} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "#8b949e", fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
                stroke="#21262d"
              />
              <YAxis tick={{ fill: "#8b949e", fontSize: 10 }} allowDecimals={false} stroke="#21262d" />
              <Tooltip
                contentStyle={{
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8b949e" }}
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
        className="bg-[#0d1117] p-4"
      >
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#8b949e]">
          <PieChart size={12} className="text-high" /> Category breakdown
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="#21262d" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#8b949e", fontSize: 9 }} />
              <PolarRadiusAxis tick={{ fill: "#8b949e", fontSize: 9 }} axisLine={false} />
              <Radar
                name="Clusters"
                dataKey="count"
                stroke={HIGH}
                fill={HIGH}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: "#161b22",
                  border: "1px solid #21262d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
