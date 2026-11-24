"use client";

import dynamic from "next/dynamic";
import type { GisMapProps, GisMarker, GisOverlays, BasemapId } from "./gis-map";

export type { GisMapProps, GisMarker, GisOverlays, BasemapId };

const GisMap = dynamic(() => import("./gis-map").then((m) => m.GisMap), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-lg bg-[#dfeaf5]" style={{ height: "100%", minHeight: 200 }}>
      <span className="text-[13px] font-medium text-ocean-500/85">Memuat peta GIS…</span>
    </div>
  ),
});

export function GisMapNoSsr(props: GisMapProps) {
  return <GisMap {...props} />;
}
