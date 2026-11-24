"use client";

/* Menu EDUKASI MITIGASI — materi kesiapsiagaan berdasarkan seluruh bahaya pada
   data olahan Kawasan Pantai Losari (Banjir, Gelombang Ekstrem & Abrasi, Cuaca
   Ekstrem, Gempa Bumi & Tsunami, Banjir Rob, dan Perlindungan Sempadan Pantai). */

import { useEffect, useState } from "react";
import {
  Backpack,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  ListChecks,
  Megaphone,
  PhoneCall,
  Route,
  Sparkles,
} from "lucide-react";
import { KONTAK_DARURAT } from "@/lib/bluetech-data";
import { EDUKASI_MITIGASI_LOSARI, type MateriEdukasi } from "@/lib/losari-data";
import { cn } from "@/lib/utils";

const FAQ_LOSARI = [
  {
    q: "Dari mana sumber data peta bahaya dan zona di Bluetech?",
    a: "Data spasial dan parameter yang digunakan bersumber dari inaRISK (BNPB), Badan Informasi Geospasial (BIG), OpenStreetMap (OSM), dan BMKG yang diolah untuk wilayah studi Kawasan Pantai Losari, Kota Makassar.",
  },
  {
    q: "Mengapa materi edukasi mencakup banjir, gelombang & abrasi, cuaca ekstrem, dan gempa?",
    a: "Keempat ancaman tersebut sesuai dengan layer raster bahaya hasil pengolahan yang tersedia di menu Peta Interaktif, dilengkapi informasi banjir rob (terkait data pasang surut) serta perlindungan sempadan pantai.",
  },
  {
    q: "Bagaimana cara melaporkan kondisi pesisir yang perlu ditindaklanjuti?",
    a: "Anda dapat menggunakan formulir Lapor Masyarakat di bagian bawah menu Mitigasi Bencana dengan memilih lokasi di sekitar Kawasan Pantai Losari.",
  },
  {
    q: "Apakah peta ini bisa digunakan sebagai panduan navigasi pelayaran?",
    a: "Tidak. Peta Bluetech disusun untuk kebutuhan perencanaan ruang laut, informasi publik, dan mitigasi bencana. Untuk navigasi kapal, gunakan peta hidrografi resmi Pushidrosal.",
  },
];

export function PublicEdukasi() {
  const [materi, setMateri] = useState<MateriEdukasi[]>(EDUKASI_MITIGASI_LOSARI);
  const [buka, setBuka] = useState<string | null>(EDUKASI_MITIGASI_LOSARI[0].id);
  const [faqBuka, setFaqBuka] = useState<number | null>(0);

  useEffect(() => {
    let mounted = true;
    fetch("/api/education", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.items) || data.items.length === 0) return;
        const mapped: MateriEdukasi[] = data.items.map(
          (it: {
            id: string;
            title: string;
            category: string;
            summary: string;
            contextLosari: string;
            steps: string[];
          }) => ({
            id: it.id,
            judul: it.title,
            kategori: it.category === "Pesisir Terkait" ? "Pesisir Terkait" : "Data Olahan",
            ringkas: it.summary,
            kenali: it.contextLosari,
            langkah: it.steps,
          }),
        );
        setMateri(mapped);
        setBuka((prev) => (prev && mapped.some((m) => m.id === prev) ? prev : mapped[0].id));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-7 md:px-6 md:py-9">
      {/* Kepala halaman */}
      <section className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ocean-500/12 px-3 py-1 text-[11.5px] font-semibold text-ocean-700 dark:text-ocean-200">
          <GraduationCap className="size-3.5" />
          Kawasan Pantai Losari · Kesiapsiagaan Bencana Pesisir
        </span>
        <h1 className="text-[23px] font-bold tracking-tight text-foreground md:text-[26px]">
          Edukasi Mitigasi Bencana
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-muted-foreground">
          Panduan praktis mengenali dan menghadapi jenis-jenis bahaya yang terpetakan pada data
          olahan Kawasan Pantai Losari — meliputi banjir, gelombang ekstrem dan abrasi, cuaca
          ekstrem, gempa bumi dan tsunami, banjir rob, serta perlindungan sempadan pantai.
        </p>
      </section>

      {/* Tiga langkah kesiapan keluarga */}
      <section className="pub-hero rounded-2xl p-6 md:p-7">
        <h2 className="flex items-center gap-3 text-[17px] font-bold tracking-tight text-white">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
            <ListChecks className="size-5" strokeWidth={2.1} />
          </span>
          Tiga Persiapan Dasar Sebelum Bencana Terjadi
        </h2>
        <ol className="mt-4 grid gap-3 text-[13px] leading-relaxed text-white/90 md:grid-cols-3">
          <li className="rounded-xl bg-white/12 p-4 ring-1 ring-white/25">
            <span className="mb-2.5 flex size-9 items-center justify-center rounded-lg bg-white/25 text-white">
              <Route className="size-4.5" />
            </span>
            <b className="text-white">1. Kenali arah evakuasi</b>
            <br />
            Ketahui rute menuju daratan lebih tinggi atau titik kumpul aman menjauhi garis pantai
            Losari sebelum kondisi darurat terjadi.
          </li>
          <li className="rounded-xl bg-white/12 p-4 ring-1 ring-white/25">
            <span className="mb-2.5 flex size-9 items-center justify-center rounded-lg bg-white/25 text-white">
              <Backpack className="size-4.5" />
            </span>
            <b className="text-white">2. Siapkan tas siaga keluarga</b>
            <br />
            Simpan salinan dokumen penting, air minum, senter, obat pribadi, peluit, dan nomor
            kontak darurat dalam satu tas yang mudah dijangkau.
          </li>
          <li className="rounded-xl bg-white/12 p-4 ring-1 ring-white/25">
            <span className="mb-2.5 flex size-9 items-center justify-center rounded-lg bg-white/25 text-white">
              <Megaphone className="size-4.5" />
            </span>
            <b className="text-white">3. Pantau sumber resmi</b>
            <br />
            Ikuti peringatan dini cuaca, pasang surut, dan gempa dari BMKG serta arahan resmi BPBD
            Kota Makassar di lapangan.
          </li>
        </ol>
      </section>

      {/* Daftar materi edukasi per bahaya */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-foreground">
            Materi Mitigasi per Jenis Bahaya ({materi.length} Topik)
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Klik setiap topik untuk membuka konteks Kawasan Pantai Losari dan langkah penyelamatan.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {materi.map((m) => {
            const aktif = buka === m.id;
            return (
              <article key={m.id} className="pub-card overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setBuka(aktif ? null : m.id)}
                  aria-expanded={aktif}
                  className="flex w-full items-center gap-3.5 p-5 text-left"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      aktif
                        ? "bg-[linear-gradient(135deg,#0f507a,#1e9c80)] text-white"
                        : "bg-reef-500/12 text-reef-600 dark:text-reef-200",
                    )}
                  >
                    <Lightbulb className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-foreground">{m.judul}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                          m.kategori === "Data Olahan"
                            ? "bg-ocean-500/12 text-ocean-700 dark:text-ocean-200"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {m.kategori}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                      {m.ringkas}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform",
                      aktif && "rotate-180",
                    )}
                  />
                </button>

                {aktif ? (
                  <div className="border-t border-border/70 px-5 py-4">
                    <div className="mb-4 rounded-xl bg-secondary/70 p-3.5 text-[12.5px] leading-relaxed text-foreground/90">
                      <b className="text-foreground">Konteks Kawasan Pantai Losari:</b> {m.kenali}
                    </div>
                    <ol className="flex flex-col gap-2.5">
                      {m.langkah.map((langkah, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-reef-500/12 text-[11.5px] font-bold text-reef-700 dark:text-reef-200">
                            {i + 1}
                          </span>
                          <span className="text-[13.5px] leading-relaxed text-foreground/90">
                            {langkah}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {/* Kontak darurat & FAQ */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="pub-card rounded-2xl p-5 md:p-6">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-foreground">
            <HeartPulse className="size-4.5 text-destructive" />
            Nomor Darurat Penting
          </h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Simpan nomor layanan darurat nasional berikut di ponsel Anda untuk situasi mendesak.
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {KONTAK_DARURAT.map((k) => (
              <li key={k.nomor} className="pub-row flex items-center gap-3.5 rounded-xl p-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0b3d5f,#146795)] text-[15px] font-bold text-white tabular-nums">
                  {k.nomor}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-foreground">{k.layanan}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{k.ket}</p>
                </div>
                <PhoneCall className="ml-auto size-4 shrink-0 text-muted-foreground/60" />
              </li>
            ))}
          </ul>
        </div>

        <div className="pub-card rounded-2xl p-5 md:p-6">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-foreground">
            <Sparkles className="size-4.5 text-ocean-500" />
            Pertanyaan yang Sering Diajukan
          </h3>
          <div className="mt-3 flex flex-col divide-y divide-border/70">
            {FAQ_LOSARI.map((f, i) => {
              const aktif = faqBuka === i;
              return (
                <div key={i} className="py-1.5">
                  <button
                    type="button"
                    onClick={() => setFaqBuka(aktif ? null : i)}
                    aria-expanded={aktif}
                    className="flex w-full items-center justify-between gap-3 py-2 text-left"
                  >
                    <span className="text-[13.5px] font-semibold text-foreground">{f.q}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        aktif && "rotate-180",
                      )}
                    />
                  </button>
                  {aktif ? (
                    <p className="pb-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {f.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
