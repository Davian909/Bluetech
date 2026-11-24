"use client";

import dynamic from "next/dynamic";
import type {
  LosariBasemap,
  LosariMapProps,
  LosariPointMarker,
  LosariRasterOverlay,
} from "./losari-map";

export type { LosariBasemap, LosariMapProps, LosariPointMarker, LosariRasterOverlay };

const LosariMap = dynamic(() => import("./losari-map").then((m) => m.LosariMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] w-full items-center justify-center rounded-2xl border border-border bg-secondary/60">
      <span className="text-[13px] font-medium text-muted-foreground">
        Memuat peta Kawasan Pantai Losari...
      </span>
    </div>
  ),
});

export function LosariMapNoSsr(props: LosariMapProps) {
  return <LosariMap {...props} />;
}
