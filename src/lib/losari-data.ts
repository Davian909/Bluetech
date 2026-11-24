/**
 * Pusat data & tipe untuk Antarmuka Publik Bluetech — Kawasan Pantai Losari.
 * Seluruh data spasial dan pasang surut dimuat dari hasil pra-proses di public/data/
 * (dibangkitkan lewat: node scripts/prepare_public_data.mjs).
 */

export const LOSARI_CENTER: [number, number] = [-5.1438, 119.4005];
export const LOSARI_DEFAULT_ZOOM = 14;
export const LOSARI_BOUNDS: [[number, number], [number, number]] = [
  [-5.161, 119.38],
  [-5.127, 119.418],
];

export interface RasterLegendGradient {
  type: "gradient";
  gradient: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
}

export interface RasterLegendClasses {
  type: "classes";
  items: { label: string; color: string }[];
}

export interface RasterLayerMeta {
  id: string;
  name: string;
  category: "Kebencanaan" | "Pariwisata" | "Infrastruktur";
  description: string;
  sourceFile: string;
  url: string;
  sourceCrs: string;
  webCrs: string;
  bounds: [[number, number], [number, number]];
  nativePx?: [number, number];
  nativeCropPx?: [number, number];
  pixelSizeMeters?: [number, number];
  pngPx: [number, number];
  pngBytes: number;
  validPixels?: number;
  nodataPixels?: number;
  valueRangeLocal?: [number, number] | null;
  classCounts?: Record<string, number>;
  legend: RasterLegendGradient | RasterLegendClasses;
  note: string | null;
  defaultVisible: boolean;
}

export interface ZonaWisataSummary {
  gridcode: number;
  kelas: "Tinggi" | "Sedang" | "Rendah";
  warna: string;
  luasHa: number;
  luasKm2: number;
  ringkas: string;
  aktivitas: string;
}

export interface AtraksiItem {
  id: string;
  osm_id: string;
  name: string;
  original_name: string | null;
  tourism: string;
  kategori: string;
  artwork_type: string | null;
  operator: string | null;
  deskripsi: string;
  lat: number;
  lon: number;
}

export interface ZonaMitigasiSummary {
  gridcode: number | null;
  zona: string;
  warna: string;
  urutan: number;
  luasHa: number;
  luasKm2: number;
  ringkas: string;
  arahan: string;
}

export interface PasangSurutEkstremRow {
  waktu: string;
  ketinggian: number;
  jenis: "Pasang" | "Surut";
}

export interface PasangSurutEkstremData {
  sourceFile: string;
  periode: { mulai: string; akhir: string };
  ringkasan: {
    totalKejadian: number;
    jumlahPasang: number;
    jumlahSurut: number;
    pasangTertinggi: PasangSurutEkstremRow;
    surutTerendah: PasangSurutEkstremRow;
  };
  data: PasangSurutEkstremRow[];
}

export interface PasangSurutDeretData {
  sourceFile: string;
  intervalMenit: number;
  totalBaris: number;
  periode: { mulai: string; akhir: string };
  tanggalTersedia: string[];
  rentang: {
    est: [number, number];
    msl: [number, number];
    lat: [number, number];
  };
  perJam: { t: string; full: string; est: number; msl: number; lat: number }[];
  lengkap: [string, number, number, number][];
}

export interface LosariManifest {
  generatedAt: string;
  wilayahStudi: {
    nama: string;
    kota: string;
    sumberData: string[];
    center: [number, number];
    defaultZoom: number;
    bounds: [[number, number], [number, number]];
  };
  rasters: RasterLayerMeta[];
  vectors: {
    zonaWisataUrl: string;
    atraksiWisataUrl: string;
    zonaMitigasiUrl: string;
    ringkasan: {
      zonaWisata: ZonaWisataSummary[];
      atraksiWisata: AtraksiItem[];
      zonaMitigasi: ZonaMitigasiSummary[];
    };
  };
  pasangSurut: {
    ekstremUrl: string;
    deretUrl: string;
    ringkasan: {
      ekstrem: PasangSurutEkstremData["ringkasan"];
      deret: {
        totalBaris: number;
        periode: { mulai: string; akhir: string };
        rentang: PasangSurutDeretData["rentang"];
        jumlahHari: number;
      };
    };
  };
}

/* ---------------- Cache pemuat JSON / GeoJSON di browser ---------------- */

const jsonCache = new Map<string, Promise<unknown>>();

function fetchCachedJson<T>(url: string): Promise<T> {
  let req = jsonCache.get(url);
  if (!req) {
    req = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Gagal memuat ${url} (${res.status})`);
      return res.json();
    });
    jsonCache.set(url, req);
  }
  return req as Promise<T>;
}

export const fetchManifest = () => fetchCachedJson<LosariManifest>("/data/manifest.json");
export const fetchZonaWisata = () =>
  fetchCachedJson<GeoJSON.FeatureCollection>("/data/vector/zona_wisata.geojson");
export const fetchAtraksiWisata = () =>
  fetchCachedJson<GeoJSON.FeatureCollection>("/data/vector/atraksi_wisata.geojson");
export const fetchZonaMitigasi = () =>
  fetchCachedJson<GeoJSON.FeatureCollection>("/data/vector/zona_mitigasi.geojson");
export const fetchPasangSurutEkstrem = () =>
  fetchCachedJson<PasangSurutEkstremData>("/data/parameter/pasang_surut_ekstrem.json");
export const fetchPasangSurutDeret = () =>
  fetchCachedJson<PasangSurutDeretData>("/data/parameter/pasang_surut_deret.json");

/* ---------------- Daftar lokasi Kawasan Pantai Losari (Lapor Warga) ---------------- */

export const LOKASI_LOSARI = [
  "Anjungan Pantai Losari",
  "Centre Point of Indonesia (CPI)",
  "Koridor Jl. Penghibur",
  "Pulau Lae-Lae",
  "Kawasan Mariso & Mattoangin",
  "Kawasan Ujung Pandang & Fort Rotterdam",
  "Muara Jeneberang / Tanjung Bunga",
];

/* ---------------- Materi Edukasi Mitigasi (Selaras Data Olahan) ---------------- */

export interface MateriEdukasi {
  id: string;
  judul: string;
  kategori: "Data Olahan" | "Pesisir Terkait";
  ringkas: string;
  kenali: string;
  langkah: string[];
}

export const EDUKASI_MITIGASI_LOSARI: MateriEdukasi[] = [
  {
    id: "banjir",
    judul: "Banjir Pesisir & Genangan Perkotaan",
    kategori: "Data Olahan",
    ringkas: "Genangan akibat curah hujan tinggi yang tertahan di dataran rendah pesisir atau saat pasang laut bersamaan.",
    kenali:
      "Pada raster bahaya banjir (inaRISK), area rendah di sekitar permukiman pesisir dan pertemuan drainase kota memiliki indeks genangan lebih tinggi, terutama ketika hujan lebat bertepatan dengan muka air laut pasang.",
    langkah: [
      "Bersihkan saluran drainase di sekitar rumah dan tempat usaha sebelum puncak musim hujan.",
      "Simpan dokumen penting, barang elektronik, dan perlengkapan darurat di rak atau lantai yang lebih tinggi.",
      "Matikan aliran listrik dari MCB utama apabila air mulai masuk ke dalam rumah.",
      "Hindari melintasi jalan tergenang yang arusnya deras atau lubang drainasenya tidak terlihat.",
    ],
  },
  {
    id: "gelombang-abrasi",
    judul: "Gelombang Ekstrem & Abrasi Pantai",
    kategori: "Data Olahan",
    ringkas: "Gelombang tinggi dari perairan barat yang mengikis tepian pantai serta membahayakan aktivitas laut.",
    kenali:
      "Data raster gelombang ekstrem dan abrasi menunjukkan koridor tepi laut Pantai Losari, kawasan reklamasi CPI, serta tepi Pulau Lae-Lae berada pada zona paparan langsung gelombang musim barat.",
    langkah: [
      "Tunda penyeberangan perahu kecil (termasuk ke Pulau Lae-Lae) apabila tinggi gelombang dan kecepatan angin meningkat.",
      "Jauhi bibir tanggul atau pemecah ombak saat gelombang memecah tinggi ke arah promenade.",
      "Laporkan retakan talud, penurunan trotoar pantai, atau pengikisan pasir secara dini lewat formulir Lapor Warga.",
      "Dukung upaya perlindungan pantai seperti pemeliharaan struktur penahan gelombang dan vegetasi pesisir.",
    ],
  },
  {
    id: "cuaca-ekstrem",
    judul: "Cuaca Ekstrem (Angin Kencang & Hujan Badai)",
    kategori: "Data Olahan",
    ringkas: "Perubahan cuaca mendadak berupa hujan sangat lebat, angin kencang, dan petir di ruang terbuka pesisir.",
    kenali:
      "Kawasan tepi laut yang terbuka memiliki hambatan angin rendah, sehingga hembusan angin kencang saat awan cumulonimbus berkembang cepat berisiko merobohkan tenda, papan reklame, maupun pohon di ruang publik.",
    langkah: [
      "Pantau peringatan dini cuaca maritim dan harian dari BMKG sebelum berkegiatan di ruang terbuka pantai.",
      "Segera tinggalkan area anjungan terbuka saat awan gelap menebal, angin mendadak kencang, atau terdengar guruh.",
      "Hindari berteduh di bawah pohon besar, baliho, atau struktur ringan yang mudah diterbangkan angin.",
      "Amankan perahu, tenda kuliner, dan peralatan usaha di sepanjang koridor Jl. Penghibur dengan ikatan kuat.",
    ],
  },
  {
    id: "gempa-tsunami",
    judul: "Gempa Bumi & Kewaspadaan Tsunami",
    kategori: "Data Olahan",
    ringkas: "Guncangan tanah akibat aktivitas tektonik yang dapat memicu kerusakan bangunan maupun bahaya ikutan di pesisir.",
    kenali:
      "Di kawasan pesisir padat seperti Makassar, kesiapsiagaan gempa mencakup perlindungan diri di dalam bangunan serta langkah evakuasi menjauhi pantai apabila terjadi guncangan kuat berkepanjangan.",
    langkah: [
      "Saat guncangan berlangsung: lindungi kepala, berlindung di bawah meja kokoh, dan jauhi kaca serta lemari tinggi.",
      "Setelah guncangan reda, keluar menuju ruang terbuka menjauhi gedung bertingkat, tiang listrik, dan dinding retak.",
      "Apabila gempa terasa kuat lebih dari 20 detik di dekat laut atau air laut surut mendadak, segera menjauh ke daratan lebih tinggi tanpa menunggu sirene.",
      "Ikuti informasi resmi dari BMKG dan BPBD Kota Makassar sebelum kembali ke area pesisir.",
    ],
  },
  {
    id: "banjir-rob",
    judul: "Banjir Rob (Pasang Air Laut Maksimum)",
    kategori: "Pesisir Terkait",
    ringkas: "Kenaikan muka air laut saat pasang purnama yang melimpas ke tepian rendah dan muara sungai.",
    kenali:
      "Berdasarkan data pasang surut Kawasan Pantai Losari (21 Nov – 20 Des 2026), amplitudo pasang terhadap MSL mencapai ±0,83 meter (hingga 1,72 m terhadap LAT), sehingga puncak pasang perlu dicermati terutama bila bersamaan hujan.",
    langkah: [
      "Periksa jadwal puncak pasang pada grafik dan tabel pasang surut di menu Mitigasi Bencana.",
      "Pindahkan kendaraan dan barang berharga dari area parkir atau pelataran rendah menjelang jam pasang puncak.",
      "Hindari kontak lama dengan genangan air laut bercampur limbah drainase untuk mencegah gangguan kulit.",
      "Pastikan pintu air atau katup saluran buangan lingkungan berfungsi dengan baik.",
    ],
  },
  {
    id: "sempadan-pantai",
    judul: "Perlindungan Sempadan Pantai",
    kategori: "Data Olahan",
    ringkas: "Zona penyangga alami dan buatan di sepanjang garis pantai untuk menjaga keamanan daratan dari ancaman laut.",
    kenali:
      "Pada peta zona mitigasi Kawasan Pantai Losari, area Sempadan Pantai tercatat seluas ±133 Ha sebagai koridor penyangga penting antara perairan Selat Makassar dan kawasan terbangun kota.",
    langkah: [
      "Hormati batas sempadan pantai dan tidak mendirikan bangunan permanen di area lindung tepi laut.",
      "Jaga kebersihan tepi pantai dan muara agar sampah tidak menyumbat aliran air maupun merusak ekosistem pesisir.",
      "Manfaatkan sempadan pantai secara bertanggung jawab sebagai ruang terbuka publik dan jalur akses evakuasi.",
    ],
  },
];

/* ---------------- Format tanggal sederhana (Indonesia) ---------------- */

const BULAN_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatTanggalWaktuId(isoLike: string): string {
  // Format input: "2026-11-26 10:50:00"
  const [tgl, jam] = isoLike.split(" ");
  if (!tgl) return isoLike;
  const [y, m, d] = tgl.split("-").map(Number);
  const bln = BULAN_ID[(m || 1) - 1] ?? "";
  return `${d} ${bln} ${y}${jam ? `, ${jam.slice(0, 5)}` : ""}`;
}

export function formatTanggalSingkat(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  const bln = BULAN_ID[(m || 1) - 1] ?? "";
  return `${d} ${bln}`;
}
