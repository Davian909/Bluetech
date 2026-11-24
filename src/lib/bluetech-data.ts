// Shared data & types for Bluetech application

/* ---------------- Peran pengguna & struktur menu ---------------- */

/** Peran pengguna Bluetech: masyarakat umum atau admin/pengelola sistem. */
export type Role = "masyarakat" | "admin";

/* Autentikasi Admin diverifikasi di server (/api/admin/login) memakai variabel
   lingkungan ADMIN_USERNAME & ADMIN_PASSWORD pada file .env. */

export type AdminMenuKey =
  | "dashboard"
  | "kesesuaian-wisata"
  | "kesesuaian-mitigasi"
  | "mitigasi"
  | "data"
  | "laporan"
  | "pengaturan"
  | "bantuan";

export type PublicMenuKey =
  | "pub-beranda"
  | "pub-peta"
  | "pub-pariwisata"
  | "pub-mitigasi"
  | "pub-edukasi";

export type MenuKey = AdminMenuKey | PublicMenuKey;

/** Kunci localStorage untuk menyimpan peran aktif (mode demo). */
export const ROLE_STORAGE_KEY = "bluetech-role";

export interface RegionResult {
  id: string;
  name: string;
  score: number;
  category: "Sangat Sesuai" | "Cukup Sesuai" | "Sesuai Bersyarat" | "Tidak Sesuai";
  depth: number;
  area: string;
}

export const WILAYAH_LIST = [
  { id: "w1", name: "Teluk Ambon Utara", type: "Teluk", luas: "2.850 km²" },
  { id: "w2", name: "Pesisir Utara", type: "Pesisir", luas: "1.240 km²" },
  { id: "w3", name: "Selat Ambon Barat", type: "Selat", luas: "980 km²" },
  { id: "w4", name: "Teluk Baguala", type: "Teluk", luas: "760 km²" },
  { id: "w5", name: "Pantai Natsepa", type: "Pantai", luas: "420 km²" },
  { id: "w6", name: "Perairan Hila", type: "Perairan", luas: "1.670 km²" },
  { id: "w7", name: "Teluk Dalam Leihitu", type: "Teluk", luas: "1.110 km²" },
];

export const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Potensi Abrasi Tinggi",
    desc: "Terdeteksi di Pesisir Utara untuk periode 0–5 tahun.",
    time: "10 menit lalu",
    unread: true,
    tone: "danger" as const,
  },
  {
    id: "n2",
    title: "Data Batimetri Baru",
    desc: "Survei hidrografi Q2 telah tersedia untuk diunduh.",
    time: "2 jam lalu",
    unread: true,
    tone: "info" as const,
  },
  {
    id: "n3",
    title: "Laporan Bulanan Siap",
    desc: "Laporan Zona Pemanfaatan Juni telah dibuat otomatis.",
    time: "Kemarin",
    unread: false,
    tone: "success" as const,
  },
];

export const JENIS_PEMANFAATAN = [
  { value: "pelabuhan", label: "Pelabuhan", icon: "ship" },
  { value: "pariwisata", label: "Pariwisata Bahari", icon: "waves" },
  { value: "mangrove", label: "Konservasi Mangrove", icon: "tree" },
  { value: "tambak", label: "Tambak Ikan", icon: "fish" },
  { value: "konservasi", label: "Konservasi Laut", icon: "shield" },
];

export const KEDALAMAN_MIN = [
  { value: "5", label: "5 m" },
  { value: "10", label: "10 m" },
  { value: "15", label: "15 m" },
  { value: "20", label: "20 m" },
];

export interface RiskType {
  id: string;
  label: string;
  level: "Rendah" | "Sedang" | "Tinggi";
  score: number; // arc %
  affectedArea: number; // %
  vulnerability: string;
  recommendation: string;
  description: string;
}

export const RISK_TYPES: RiskType[] = [
  {
    id: "abrasi",
    label: "Abrasi",
    level: "Sedang",
    score: 65,
    affectedArea: 35,
    vulnerability: "Sedang",
    recommendation: "Penguatan perlindungan pantai",
    description:
      "Abrasi adalah erosi garis pantai akibat gelombang dan arus sejalan pantai. Pesisir Utara memiliki laju erosi hingga 2,4 m/tahun.",
  },
  {
    id: "tsunami",
    label: "Tsunami",
    level: "Rendah",
    score: 30,
    affectedArea: 12,
    vulnerability: "Rendah",
    recommendation: "Penyusunan jalur evakuasi dan edukasi masyarakat",
    description:
      "Pemodelan run-up tsunami menunjukkan zona genangan terbatas pada teluk terbuka. Waktu tiba gelombang diperkirakan 28–45 menit dari sumber terdekat.",
  },
  {
    id: "banjir-rob",
    label: "Banjir Rob",
    level: "Tinggi",
    score: 85,
    affectedArea: 48,
    vulnerability: "Tinggi",
    recommendation: "Pembangunan tanggul rob dan perbaikan drainase lahan",
    description:
      "Genangan rob musiman mengancam kawasan pesisir dataran rendah. Periode puncak terjadi saat pasang purnama dan musim angin barat.",
  },
  {
    id: "gelombang-ekstrem",
    label: "Gelombang Ekstrem",
    level: "Sedang",
    score: 58,
    affectedArea: 28,
    vulnerability: "Sedang",
    recommendation: "Penanaman vegetasi pelindung dan pembangunan breakwater",
    description:
      "Gelombang tinggi dari Barat Laut mencapai 4–6 m saat musim transisi. Paparan tertinggi pada pantai menghadap terbuka tanpa pemecah gelombang alami.",
  },
];

/* Luas per potensi kesesuaian (km²) — konsisten dengan 2 jenis analisis:
   pariwisata (eksisting & potensi baru) dan mitigasi bencana (DEMO). */
export const ZONA_PEMANFAATAN = [
  { id: "wisata-eksisting", label: "Wisata Eksisting", color: "#1e9c80", luas: 1240, colorClass: "bg-[#1e9c80]" },
  { id: "wisata-potensi", label: "Potensi Wisata Baru", color: "#1686C5", luas: 980, colorClass: "bg-[#1686C5]" },
  { id: "rawan-bencana", label: "Wilayah Rawan Bencana", color: "#E75B55", luas: 1420, colorClass: "bg-[#E75B55]" },
];

export const LEVEL_COLORS: Record<string, string> = {
  Rendah: "#22c55e",
  Sedang: "#f59e0b",
  Tinggi: "#ef4444",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Sangat Sesuai": "#22a45d",
  "Cukup Sesuai": "#4285f4",
  "Sesuai Bersyarat": "#e7c33f",
  "Tidak Sesuai": "#ef5350",
};

// Penanda peta dashboard: hanya potensi pariwisata (eksisting & baru) — DEMO
// Marker wisata eksisting membawa foto tempat; popup peta menampilkan foto + titik koordinat.
export interface PotensiMarker {
  id: string;
  lat: number;
  lon: number;
  color: string;
  glyph: string;
  label: string;
  desc: string;
  kind: "wisata-eksisting" | "wisata-potensi";
  photo?: string;
  photoAlt?: string;
  badge?: string;
  jenis?: string;
  showCoords?: boolean;
}

export const MAP_MARKERS: PotensiMarker[] = [
  { id: "w-e1", lat: -3.55, lon: 128.4, color: "#1e9c80", glyph: "camera", label: "Pantai Natsepa", desc: "Wisata eksisting — pasir putih & rujakan (DEMO)", kind: "wisata-eksisting", photo: "/wisata/pantai-natsepa.jpg", photoAlt: "Panorama Pantai Natsepa — pasir putih, pohon kelapa, dan perairan tenang", badge: "Wisata Eksisting", jenis: "Wisata Pantai", showCoords: true },
  { id: "w-e2", lat: -3.5, lon: 128.27, color: "#1e9c80", glyph: "camera", label: "Pantai Namalatu", desc: "Wisata eksisting — laguna tenang Teluk Baguala (DEMO)", kind: "wisata-eksisting", photo: "/wisata/teluk-baguala-namalatu.jpg", photoAlt: "Gerbang Pantai Namalatu di Teluk Baguala dengan bungalow pesisir", badge: "Wisata Eksisting", jenis: "Wisata Pantai & Berkemah", showCoords: true },
  { id: "w-e3", lat: -3.4, lon: 128.21, color: "#1e9c80", glyph: "camera", label: "Pantai Liang", desc: "Wisata eksisting — pasir putih pesisir Leihitu (DEMO)", kind: "wisata-eksisting", photo: "/wisata/pantai-liang.jpg", photoAlt: "Air laut jernih berwarna turquoise dengan perahu ninibot di Pantai Liang", badge: "Wisata Eksisting", jenis: "Wisata Pantai", showCoords: true },
  { id: "w-p1", lat: -3.33, lon: 128.1, color: "#1686C5", glyph: "pin", label: "Potensi Wisata — Pesisir Utara", desc: "Belum ada wisata tetap — berpotensi dikembangkan (DEMO)", kind: "wisata-potensi", badge: "Potensi Wisata Baru", jenis: "Wisata Pantai (rencana)", showCoords: true },
  { id: "w-p2", lat: -3.42, lon: 128.16, color: "#1686C5", glyph: "pin", label: "Potensi Wisata — Teluk Ambon Utara", desc: "Panorama teluk — kandidat wisata baru (DEMO)", kind: "wisata-potensi", badge: "Potensi Wisata Baru", jenis: "Wisata Bahari (rencana)", showCoords: true },
  { id: "w-p3", lat: -3.65, lon: 128.02, color: "#1686C5", glyph: "pin", label: "Potensi Wisata — Selat Ambon Barat", desc: "Sunset point — belum tergarap (DEMO)", kind: "wisata-potensi", badge: "Potensi Wisata Baru", jenis: "Wisata Bahari (rencana)", showCoords: true },
];

// Penanda wilayah rawan bencana (untuk kedepannya) — layer "Wilayah Rawan Bencana"
export const RISK_MARKERS = [
  { id: "r1", lat: -3.466, lon: 128.06, label: "Abrasi Tinggi", type: "abrasi" },
  { id: "r2", lat: -3.664, lon: 128.326, label: "Banjir Rob", type: "banjir-rob" },
  { id: "r3", lat: -3.348, lon: 128.235, label: "Gelombang Ekstrem", type: "gelombang-ekstrem" },
  { id: "r4", lat: -3.621, lon: 127.976, label: "Zona Tsunami", type: "tsunami" },
];

/* ---------------- Wisata eksisting & potensi (menu Pariwisata) ---------------- */

export interface TourismSpot {
  id: string;
  name: string;
  wilayahId: string;
  wilayah: string;
  status: "eksisting" | "potensi";
  photo?: string;
  photoAlt?: string;
  jenis: string;
  desc: string;
  facts: { label: string; value: string }[];
  lat: number;
  lon: number;
}

export const TOURISM_SPOTS: TourismSpot[] = [
  {
    id: "t1",
    name: "Pantai Natsepa",
    wilayahId: "w5",
    wilayah: "Pantai Natsepa",
    status: "eksisting",
    photo: "/wisata/pantai-natsepa.jpg",
    photoAlt: "Panorama Pantai Natsepa — pasir putih, pohon kelapa, dan perairan tenang",
    jenis: "Wisata Pantai",
    desc: "Pantai pasir putih ikonik di tepi Teluk Baguala yang sudah aktif dikunjungi wisatawan. Dikenal luas lewat kuliner khas rujak Natsepa di sepanjang tepi pantai.",
    facts: [
      { label: "Status", value: "Wisata eksisting — aktif" },
      { label: "Aktivitas Utama", value: "Berenang, kuliner rujak, panorama" },
      { label: "Skor Kesesuaian", value: "Kelas S1 — sangat sesuai" },
      { label: "Akses", value: "±45 menit dari Kota Ambon" },
    ],
    lat: -3.55,
    lon: 128.4,
  },
  {
    id: "t2",
    name: "Pantai Namalatu",
    wilayahId: "w4",
    wilayah: "Teluk Baguala",
    status: "eksisting",
    photo: "/wisata/teluk-baguala-namalatu.jpg",
    photoAlt: "Gerbang Pantai Namalatu di Teluk Baguala dengan bungalow pesisir",
    jenis: "Wisata Pantai & Berkemah",
    desc: "Pantai berbentuk tanjung bulan sabit di desa Latumahay, pesisir Teluk Baguala. Laguna tenang cocok untuk berenang, tersedia prasarana bungalow dan area berkemah.",
    facts: [
      { label: "Status", value: "Wisata eksisting — aktif" },
      { label: "Aktivitas Utama", value: "Berenang, snorkeling, berkemah" },
      { label: "Skor Kesesuaian", value: "Kelas S1 — sangat sesuai" },
      { label: "Lokasi", value: "Desa Latumahay, Teluk Baguala" },
    ],
    lat: -3.5,
    lon: 128.27,
  },
  {
    id: "t3",
    name: "Pantai Liang",
    wilayahId: "w6",
    wilayah: "Perairan Hila",
    status: "eksisting",
    photo: "/wisata/pantai-liang.jpg",
    photoAlt: "Air laut jernih berwarna turquoise dengan perahu ninibot di Pantai Liang",
    jenis: "Wisata Pantai",
    desc: "Jalur pantai pasir putih terpanjang di pesisir Leihitu, dekat desa Hila. Perairan jernih berturun dengan daya tarik perahu ninibot tradisional.",
    facts: [
      { label: "Status", value: "Wisata eksisting — aktif" },
      { label: "Aktivitas Utama", value: "Berenang, olahraga air, forum budaya" },
      { label: "Skor Kesesuaian", value: "Kelas S1 — sangat sesuai" },
      { label: "Akses", value: "±35 km pesisir utara Kota Ambon" },
    ],
    lat: -3.4,
    lon: 128.21,
  },
  {
    id: "t4",
    name: "Pesisir Utara",
    wilayahId: "w2",
    wilayah: "Pesisir Utara",
    status: "potensi",
    jenis: "Wisata Pantai (rencana)",
    desc: "Belum ada wisata tetap di segmen ini, namun garis pantai dengan vegetasi rapat dan gelombang terlindungi menunjukkan potensi pengembangan wisata baru.",
    facts: [
      { label: "Status", value: "Potensi wisata baru — belum tergarap" },
      { label: "Potensi", value: "Pantai kontemplasi & olahraga air tenang" },
      { label: "Skor Kesesuaian", value: "Kelas S2 — cukup sesuai" },
      { label: "Prasyarat", value: "Kajian akses jalan & prasarana dasar" },
    ],
    lat: -3.33,
    lon: 128.1,
  },
  {
    id: "t5",
    name: "Teluk Ambon Utara",
    wilayahId: "w1",
    wilayah: "Teluk Ambon Utara",
    status: "potensi",
    jenis: "Wisata Bahari (rencana)",
    desc: "Panorama teluk yang lebar dengan air relatif tenang — berpotensi untuk wahana keliling teluk dan sunset point, belum ada wisata eksisting.",
    facts: [
      { label: "Status", value: "Potensi wisata baru — belum tergarap" },
      { label: "Potensi", value: "Wahana keliling teluk & sunset point" },
      { label: "Skor Kesesuaian", value: "Kelas S2 — cukup sesuai" },
      { label: "Prasyarat", value: "Sinkronisasi dengan alur pelayaran" },
    ],
    lat: -3.42,
    lon: 128.16,
  },
  {
    id: "t6",
    name: "Selat Ambon Barat",
    wilayahId: "w3",
    wilayah: "Selat Ambon Barat",
    status: "potensi",
    jenis: "Wisata Bahari (rencana)",
    desc: "Selat dengan panorama bukit dan matahari terbenam yang khas. Berpotensi dikembangkan sebagai sunset point dan kalang wisata, saat ini belum tergarap.",
    facts: [
      { label: "Status", value: "Potensi wisata baru — belum tergarap" },
      { label: "Potensi", value: "Sunset point & kalang wisata" },
      { label: "Skor Kesesuaian", value: "Kelas S2 — cukup sesuai" },
      { label: "Prasyarat", value: "Pemantauan arus & akses dermaga kecil" },
    ],
    lat: -3.65,
    lon: 128.02,
  },
];

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

/* ---------------- Arus pemantauan faktor penyebab bencana ---------------- */

export type MonitoringStatus = "aman" | "waspada" | "siaga";

export interface MonitoringRow {
  id: string;
  lokasi: string;
  parameter: string;
  nilai: string;
  status: MonitoringStatus;
  waktu: string;
}

export const MONITORING_STREAM: MonitoringRow[] = [
  {
    id: "MON-2025-0912",
    lokasi: "Pesisir Utara",
    parameter: "Tinggi Gelombang",
    nilai: "2,4 m",
    status: "waspada",
    waktu: "10.15 WIT",
  },
  {
    id: "MON-2025-0911",
    lokasi: "Selat Ambon Barat",
    parameter: "Kecepatan Angin",
    nilai: "18 km/j",
    status: "aman",
    waktu: "10.12 WIT",
  },
  {
    id: "MON-2025-0910",
    lokasi: "Teluk Ambon Utara",
    parameter: "Pasang Laut (Rob)",
    nilai: "+1,1 m",
    status: "aman",
    waktu: "09.58 WIT",
  },
  {
    id: "MON-2025-0909",
    lokasi: "Pantai Natsepa",
    parameter: "Perubahan Garis Pantai",
    nilai: "-3,2 m/tahun",
    status: "siaga",
    waktu: "09.40 WIT",
  },
  {
    id: "MON-2025-0908",
    lokasi: "Perairan Hila",
    parameter: "Curah Hujan",
    nilai: "42 mm/jam",
    status: "waspada",
    waktu: "09.25 WIT",
  },
];

/* ---------------- Konten mode masyarakat umum ---------------- */

/** Penjelasan bahasa awam per parameter pemantauan (untuk Peringatan Dini). */
export const PARAMETER_PUBLIK: Record<string, { arti: string; saran: string }> = {
  "Tinggi Gelombang": {
    arti: "Gelombang laut lebih tinggi dari biasanya. Aktivitas di laut seperti berenang, menyelam, dan melaut kecil berpotensi berbahaya.",
    saran: "Hindari berenang & menyelam. Tunda rencana melaut kecil. Pantau informasi terbaru dari petugas.",
  },
  "Kecepatan Angin": {
    arti: "Angin bertiup cukup kencang di wilayah ini. Kondisi masih terkendali namun perlu diperhatikan.",
    saran: "Waspada saat beraktivitas di pantai. Kencangkan tali perahu dan bangunan pantai.",
  },
  "Pasang Laut (Rob)": {
    arti: "Kenaikan permukaan air laut saat pasang tertinggi. Saat ini masih dalam batas normal.",
    saran: "Waspada saat pasang purnama, terutama bagi rumah dekat pantai.",
  },
  "Perubahan Garis Pantai": {
    arti: "Pantai di lokasi ini terkikis (abrasi) cukup cepat — garis pantai bergerak mendekati permukiman.",
    saran: "Jauhi tepi tebing pantai. Laporkan jika Anda melihat kerusakan pantai yang memburuk.",
  },
  "Curah Hujan": {
    arti: "Hujan sangat lebat dalam satu jam terakhir. Potensi banjir dan banjir rob meningkat di pesisir.",
    saran: "Waspada banjir. Lindungi dokumen & barang berharga. Siapkan jalur evakuasi ke tempat lebih tinggi.",
  },
};

/** Kontak darurat nasional Indonesia (umum & dapat diverifikasi). */
export const KONTAK_DARURAT = [
  { layanan: "Panggilan Darurat Nasional", nomor: "112", ket: "Segala kondisi darurat" },
  { layanan: "SAR Nasional (Basarnas)", nomor: "115", ket: "Kecelakaan & pencarian di laut" },
  { layanan: "Pemadam Kebakaran", nomor: "113", ket: "Kebakaran & pertolongan cepat" },
  { layanan: "Kesehatan Darurat", nomor: "119", ket: "Ambulans & pertolongan medis" },
];

/** Materi edukasi mitigasi bencana pesisir untuk masyarakat. */
export const EDUKASI_MITIGASI = [
  {
    id: "gempa-tsunami",
    judul: "Gempa Bumi & Tsunami",
    ringkas: "Jika gempa terasa kuat & lama di pesisir, segera lari ke tempat tinggi.",
    langkah: [
      "Jika gempa terasa kuat lebih dari 20 detik, segera evakuasi mandiri ke tempat lebih tinggi.",
      "Jangan tunggu pengumuman resmi — prinsipnya: gempa besar di dekat laut, langsung lari.",
      "Tetap menjauh dari pantai sampai pengumuman aman dari BPBD/BMKG.",
      "Kenali tanda alami tsunami: laut tiba-tiba surut jauh, suara gemuruh dari laut.",
    ],
  },
  {
    id: "abrasi",
    judul: "Abrasi (Terkikisnya Pantai)",
    ringkas: "Pantai yang terkikis membuat rumah & jalan dekat pantai makin berbahaya.",
    langkah: [
      "Jangan membangun rumah/pagar terlalu dekat tepi pantai.",
      "Laporkan garis pantai yang bergerak cepat melalui menu Mitigasi Bencana.",
      "Dukung pelestarian mangrove — akarnya menahan gelombang & memperkuat pantai.",
      "Hindari mengambil pasir & batu pantai secara berlebihan.",
    ],
  },
  {
    id: "banjir-rob",
    judul: "Banjir Rob (Pasang Laut Ekstra)",
    ringkas: "Rob adalah genangan laut saat pasang tertinggi — sering menggenangi kawasan pesisir rendah.",
    langkah: [
      "Pantau jadwal pasang purnama — rob paling sering terjadi saat itu.",
      "Pindahkan barang berharga & dokumen ke tempat lebih tinggi.",
      "Hindari menggenang air rob terlalu lama — air laut bisa merusak & menyebabkan penyakit kulit.",
      "Pastikan saluran drainase rumah tidak tersumbat sampah.",
    ],
  },
  {
    id: "gelombang-ekstrem",
    judul: "Gelombang Ekstrem",
    ringkas: "Ombak besar bisa datang tiba-tiba meski cuaca terlihat cerah.",
    langkah: [
      "Perhatikan bendera peringatan di pantai — merah berarti dilarang berenang.",
      "Jangan berdiri di atas karang/tebing tepi laut saat ombak besar.",
      "Nelayan kecil: tunda melaut bila tinggi gelombang di atas 2 meter.",
      "Awasi anak-anak selalu saat berada di tepi pantai.",
    ],
  },
];

/** Jenis laporan yang bisa dikirim masyarakat. */
export const JENIS_LAPOR_PUBLIK = [
  "Abrasi / Pantai Terkikis",
  "Banjir Rob",
  "Sampah Laut & Pantai",
  "Kerusakan Terumbu Karang",
  "Gelombang Ekstrem",
  "Mangrove Rusak",
  "Lainnya",
];

/** Status laporan masyarakat. */
export type LaporStatus = "diterima" | "diproses" | "selesai";

/* ---------------- Peta potensi bencana pesisir (mode masyarakat) ---------------- */

/** Potensi terjadinya bencana pesisir per titik lokasi — hasil olahan data
 *  pemantauan (gelombang, pasang/rob, abrasi, hujan) yang disajikan dalam
 *  bahasa awam agar warga tahu area mana yang perlu diwaspadai.
 *  Seluruh nilai adalah DEMO / simulasi. */
export type TingkatPotensi = "tinggi" | "sedang" | "rendah";

export interface PotensiBencana {
  id: string;
  lokasi: string;
  jenis: string;
  tingkat: TingkatPotensi;
  skor: number; // 0–100, semakin tinggi semakin rawan (DEMO)
  ringkas: string;
  faktor: { label: string; nilai: string; ket: string }[];
  waspada: string;
  lat: number;
  lon: number;
}

/** Warna titik peta & badge per tingkat potensi (dipakai peta masyarakat). */
export const TINGKAT_POTENSI_WARNA: Record<TingkatPotensi, { label: string; warna: string }> = {
  tinggi: { label: "Risiko Tinggi", warna: "#ef5350" },
  sedang: { label: "Risiko Sedang", warna: "#e7c33f" },
  rendah: { label: "Risiko Rendah", warna: "#1e9c80" },
};

export const POTENSI_BENCANA: PotensiBencana[] = [
  {
    id: "b1",
    lokasi: "Pantai Natsepa & Tepian Teluk Baguala",
    jenis: "Abrasi Pantai",
    tingkat: "tinggi",
    skor: 82,
    ringkas:
      "Pantai terkikis cukup cepat dan terus mendekati permukiman, warung, dan dermaga kecil di sekitar lokasi.",
    faktor: [
      { label: "Perubahan garis pantai", nilai: "-3,2 m/tahun", ket: "Terkikis cepat — garis pantai bergerak mendekati rumah warga." },
      { label: "Bentuk pantai", nilai: "Landai & berpasir", ket: "Pantai landai lebih mudah terkikis saat gelombang besar." },
      { label: "Pelindung pantai", nilai: "Tipis", ket: "Karang & mangrove sedikit, tak mampu menahan gelombang." },
    ],
    waspada:
      "Jangan membangun rumah/pagar terlalu dekat tepi pantai. Jauhi tepian yang sudah retak atau miring, dan laporkan bila kikisan memburuk lewat formulir laporan di bawah.",
    lat: -3.53,
    lon: 128.36,
  },
  {
    id: "b2",
    lokasi: "Pesisir Rendah Teluk Baguala",
    jenis: "Banjir Rob",
    tingkat: "tinggi",
    skor: 77,
    ringkas:
      "Rumah dan pekarangan di tepian rendah sering tergenang air laut saat pasang purnama, terlebih saat hujan deras bersamaan.",
    faktor: [
      { label: "Elevasi tepian", nilai: "Rendah (< 1,5 m)", ket: "Rumah di tepian rendah mudah tergenang saat rob." },
      { label: "Kenaikan pasang", nilai: "+1,1 m", ket: "Rob paling sering terjadi saat pasang purnama." },
      { label: "Riwayat laporan warga", nilai: "3 laporan rob", ket: "Warga berulang kali melaporkan air laut masuk pekarangan." },
    ],
    waspada:
      "Pantau jadwal pasang purnama. Pindahkan barang, dokumen, dan alat masak ke tempat lebih tinggi sebelum malam pasang. Bersihkan saluran air agar genangan cepat surut.",
    lat: -3.64,
    lon: 128.3,
  },
  {
    id: "b3",
    lokasi: "Pesisir Utara (Leihitu)",
    jenis: "Gelombang Ekstrem",
    tingkat: "sedang",
    skor: 66,
    ringkas:
      "Pantai terbuka langsung menghadap laut lepas, sehingga ombak besar bisa datang tiba-tiba meski cuaca terlihat cerah.",
    faktor: [
      { label: "Tinggi gelombang terukur", nilai: "2,4 m", ket: "Gelombang di atas 2 m berbahaya bagi perahu kecil & aktivitas pantai." },
      { label: "Paparan laut", nilai: "Terbuka (laut lepas)", ket: "Tidak ada teluk/tanggul alami yang menahan gelombang." },
      { label: "Musim angin", nilai: "Barat (Des–Feb)", ket: "Gelombang membesar saat musim angin barat." },
    ],
    waspada:
      "Nelayan kecil sebaiknya tunda melaut saat gelombang di atas 2 meter. Jangan berdiri di atas karang atau tebing tepi laut, dan awasi anak-anak saat di pantai.",
    lat: -3.35,
    lon: 128.23,
  },
  {
    id: "b4",
    lokasi: "Selat Ambon Barat",
    jenis: "Tsunami & Arus Selat",
    tingkat: "sedang",
    skor: 59,
    ringkas:
      "Selat yang sempit dan dalam dapat menguatkan arus saat gelombang besar, dan termasuk jalur yang terdampak bila terjadi tsunami di sekitar teluk.",
    faktor: [
      { label: "Bentuk selat", nilai: "Sempit & dalam", ket: "Selat sempit bisa memperkuat arus dan tinggi gelombang." },
      { label: "Arus selat", nilai: "Kencang saat pasang", ket: "Arus kuat berbahaya bagi perahu kecil & penyelam." },
      { label: "Jalur tsunami", nilai: "Area berpotensi terdampak", ket: "Bila gempa besar terasa, pesisir selat harus segera dievakuasi." },
    ],
    waspada:
      "Jika gempa terasa kuat dan berlangsung lama, langsung menuju tempat lebih tinggi — jangan menunggu pengumuman. Perahu kecil hindari melintasi selat saat arus kencang.",
    lat: -3.62,
    lon: 127.98,
  },
  {
    id: "b5",
    lokasi: "Perairan Hila & Sekitarnya",
    jenis: "Banjir Pesisir saat Hujan Lebat",
    tingkat: "sedang",
    skor: 55,
    ringkas:
      "Hujan sangat lebat dalam waktu singkat memicu genangan dan banjir di tepian pesisir yang rendah di sekitar wilayah ini.",
    faktor: [
      { label: "Curah hujan ekstrem", nilai: "42 mm/jam", ket: "Hujan lebat memicu genangan pesisir dalam hitungan jam." },
      { label: "Saluran drainase", nilai: "Terbatas", ket: "Air hujan lambat tersalurkan sehingga genangan lebih lama." },
      { label: "Aliran sungai kecil", nilai: "Menuju pantai", ket: "Air hujan dari daratan terbawa cepat ke tepian pantai." },
    ],
    waspada:
      "Waspada banjir saat hujan lebat, terutama menjelang malam. Lindungi dokumen & barang berharga, dan siapkan jalur menuju tempat yang lebih tinggi.",
    lat: -3.47,
    lon: 128.06,
  },
  {
    id: "b6",
    lokasi: "Teluk Ambon Utara",
    jenis: "Genangan & Rob Pesisir",
    tingkat: "rendah",
    skor: 38,
    ringkas:
      "Kondisi pasang dan pantai di wilayah ini cenderung stabil. Tetap pantau peringatan dini karena rob bisa berubah saat musim pasang ekstrem.",
    faktor: [
      { label: "Kondisi pasang", nilai: "+1,1 m (normal)", ket: "Pasang masih dalam batas normal." },
      { label: "Perubahan pantai", nilai: "Stabil", ket: "Tidak ada kikisan berarti pada tahun ini." },
    ],
    waspada:
      "Kondisi cenderung aman untuk beraktivitas. Tetap ikuti status peringatan dini terbaru di bawah sebelum melaut atau membuka aktivitas di pantai.",
    lat: -3.42,
    lon: 128.16,
  },
];

/** Tautan titik potensi bencana → baris pemantauan terkini (DEMO).
 *  Nilai null berarti titik belum memiliki sensor pemantauan langsung. */
export const POTENSI_MON_LINK: Record<string, string | null> = {
  b1: "MON-2025-0909", // Pantai Natsepa — Perubahan Garis Pantai (Siaga)
  b2: null, // Pesisir Rendah Teluk Baguala — belum ada sensor, pantau laporan warga
  b3: "MON-2025-0912", // Pesisir Utara — Tinggi Gelombang (Waspada)
  b4: "MON-2025-0911", // Selat Ambon Barat — Kecepatan Angin (Aman)
  b5: "MON-2025-0908", // Perairan Hila — Curah Hujan (Waspada)
  b6: "MON-2025-0910", // Teluk Ambon Utara — Pasang Laut/Rob (Aman)
};

/* ---------------- Prediksi kesesuaian pariwisata (mode masyarakat) ---------------- */

/** Prediksi kesesuaian pariwisata versi bahasa awam — penyajian hasil
 *  MCDA/AHP (menu Kesesuaian Pariwisata milik Admin) agar masyarakat umum
 *  bisa memanfaatkan potensi wisata yang belum ada untuk membuka wisata baru.
 *  Seluruh nilai adalah DEMO / simulasi. */
export interface PrediksiPariwisata {
  spotId: string; // rujuk ke TOURISM_SPOTS dengan status "potensi"
  skor: number; // 0–100 (DEMO)
  kelas: "S1" | "S2" | "S3";
  kriteria: { label: string; nilai: number; arti: string }[];
  jenisUsaha: string[];
  saranAwam: string;
}

/** Arti kelas kesesuaian dalam bahasa awam. */
export const ARTI_KELAS_PUBLIK: Record<
  string,
  { judul: string; desc: string; warna: string }
> = {
  S1: {
    judul: "Sangat Sesuai",
    desc: "Kondisi laut & pantai sangat mendukung — direkomendasikan sebagai prioritas pembukaan wisata baru.",
    warna: "#1e9c80",
  },
  S2: {
    judul: "Cukup Sesuai",
    desc: "Lokasi bagus untuk wisata baru, dengan beberapa hal yang perlu disiapkan sebelum mulai.",
    warna: "#1686C5",
  },
  S3: {
    judul: "Sesuai Bersyarat",
    desc: "Bisa dikembangkan bila syarat tertentu dipenuhi (akses jalan, prasarana dasar, atau izin khusus).",
    warna: "#e7c33f",
  },
};

/** Prediksi per lokasi potensi wisata baru (selaras dengan hasil analisis Admin). */
export const PREDIKSI_PARIWISATA: PrediksiPariwisata[] = [
  {
    spotId: "t4", // Pesisir Utara
    skor: 76,
    kelas: "S2",
    kriteria: [
      { label: "Gelombang tenang", nilai: 84, arti: "Ombak relatif kecil — aman untuk renang & kano" },
      { label: "Ekosistem sehat", nilai: 79, arti: "Karang & lamun masih baik di beberapa titik" },
      { label: "Aksesibilitas", nilai: 64, arti: "Jalan menuju lokasi perlu diperbaiki" },
      { label: "Pantai stabil", nilai: 76, arti: "Tidak ada abrasi berat pada segmen ini" },
    ],
    jenisUsaha: ["Wisata pantai keluarga", "Sewa kano & alat snorkel", "Warung kuliner pantai"],
    saranAwam:
      "Mulai dari usaha kecil (warung & sewa alat) sambil menunggu perbaikan akses jalan. Koordinasikan dengan pemerintah desa untuk pengelolaan bersama.",
  },
  {
    spotId: "t5", // Teluk Ambon Utara
    skor: 74,
    kelas: "S2",
    kriteria: [
      { label: "Gelombang tenang", nilai: 88, arti: "Air teluk sangat tenang — ideal wahana keliling" },
      { label: "Ekosistem sehat", nilai: 70, arti: "Terumbu di beberapa sisi teluk perlu dipantau" },
      { label: "Aksesibilitas", nilai: 72, arti: "Dekat jalur utama, perlu dermaga kecil" },
      { label: "Pantai stabil", nilai: 66, arti: "Sebagian tepi teluk terkikis saat pasang" },
    ],
    jenisUsaha: ["Wahana keliling teluk (perahu wisata)", "Sunset point & spot foto", "Pancing bersama (fishing trip)"],
    saranAwam:
      "Potensi terbesar di wahana perahu keliling teluk. Hindari jalur kapal besar dan siapkan dermaga kecil bersama kelompok masyarakat.",
  },
  {
    spotId: "t6", // Selat Ambon Barat
    skor: 71,
    kelas: "S2",
    kriteria: [
      { label: "Gelombang tenang", nilai: 61, arti: "Arus selat cukup kuat — pilih titik yang terlindung" },
      { label: "Ekosistem sehat", nilai: 75, arti: "Bukit karang & biota laut relatif terjaga" },
      { label: "Aksesibilitas", nilai: 70, arti: "Akses jalan ada, parkir masih terbatas" },
      { label: "Pantai stabil", nilai: 78, arti: "Tepi pantai relatif stabil" },
    ],
    jenisUsaha: ["Sunset point & kafe tepi laut", "Spot diving/drift dive berpengalaman", "Kalang wisata (bukit laut)"],
    saranAwam:
      "Kekuatan lokasi ini panorama matahari terbenam. Usaha kafe & spot foto bisa mulai lebih dulu; aktivitas menyelam hanya untuk yang berpengalaman karena arus.",
  },
];

/** Langkah sederhana masyarakat memanfaatkan prediksi untuk membuka wisata baru. */
export const LANGKAH_BUKA_WISATA = [
  {
    judul: "Temukan lokasi berpotensi",
    desc: "Lihat peta & kartu prediksi di halaman ini — cari titik berlabel “Potensi Wisata Baru” dengan skor tinggi.",
  },
  {
    judul: "Cek langsung di lapangan",
    desc: "Prediksi adalah gambaran awal. Datangi lokasi untuk memastikan akses, keamanan, dan kondisi pantai.",
  },
  {
    judul: "Bicara dengan pemerintah desa/kelurahan",
    desc: "Sampaikan rencana usaha wisata. Tanah pesisir & pengelolaannya biasanya diatur bersama masyarakat.",
  },
  {
    judul: "Urus izin & kelola bersama",
    desc: "Konsultasikan izin usaha wisata ke dinas terkait. Libatkan warga sekitar agar manfaatnya dirasakan bersama.",
  },
  {
    judul: "Jaga pantai tetap lestari",
    desc: "Wisata sehat hanya bisa berlanjut kalau pantai & lautnya bersih — kelola sampah dan jangan rusak karang.",
  },
];
