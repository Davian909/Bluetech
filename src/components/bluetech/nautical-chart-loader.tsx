"use client";

import dynamic from "next/dynamic";

const NauticalChartCard = dynamic(
  () => import("./nautical-chart").then((m) => m.NauticalChartCard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center rounded-2xl border bg-secondary md:h-[470px]">
        <span className="text-[13px] font-medium text-muted-foreground">Memuat peta laut…</span>
      </div>
    ),
  },
);

export function NauticalChartCardNoSsr() {
  return <NauticalChartCard />;
}
