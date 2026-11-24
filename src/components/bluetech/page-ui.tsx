"use client";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#0b3d5f,#146795,#1e9c80)] text-cream-50 shadow-[0_6px_16px_-6px_rgba(11,61,95,0.6)]">
          <Icon className="relative z-10 h-5.5 w-5.5" strokeWidth={2.2} />
          <span aria-hidden="true" className="shimmer-line absolute inset-0 opacity-50" />
        </span>
        <div>
          <h2 className="text-[21px] leading-tight font-bold text-ocean-900">{title}</h2>
          <p className="text-[13px] text-ocean-600/80">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
  action,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={`card-marine card-lift p-5 ${className}`}>
      {title && (
        <div className="mb-3.5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-ocean-900">
            <span className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,#1d80b2,#3cb899)]" />
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Selesai: "bg-reef-100 text-reef-700",
    Tersedia: "bg-reef-100 text-reef-700",
    Diproses: "bg-cream-200 text-[#8a6d1f]",
    Berjalan: "bg-ocean-100 text-ocean-700",
    Direncanakan: "bg-slate-100 text-slate-600",
    Validasi: "bg-violet-100 text-violet-700",
    Tinggi: "bg-[#fdeeea] text-coral-600",
    Sedang: "bg-cream-200 text-[#8a6d1f]",
    Rendah: "bg-reef-100 text-reef-700",
    Aktif: "bg-ocean-100 text-ocean-700",
  };
  return (
    <span className={`status-pop inline-block rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
