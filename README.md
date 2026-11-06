## ✨ Fitur Utama

*   **Generasi Prosedural:** Atur jumlah helaian rambut, ketebalan, panjang, lengkungan (*bend*), dan gelombang (*waviness*) secara *real-time*.
*   **Kustomisasi Warna:** Dukungan gradien dari akar ke ujung rambut, beserta variasi *highlight* yang acak.
*   **Multi-Map Export:** Menghasilkan dan mengunduh berbagai jenis peta tekstur untuk kebutuhan *rendering* 3D:
    *   Alpha (Opacity) Map
    *   Base Color Map
    *   Height Map
    *   Normal Map
    *   Ambient Occlusion (AO) Map
    *   Root-Tip Mask
*   **Resolusi Fleksibel:** Atur dimensi kanvas (lebar x tinggi) sesuai kebutuhan proyek Anda (hingga 4096px).

## 📂 Struktur Folder (Clean Code)

Proyek ini dipisahkan menjadi beberapa modul untuk memudahkan pengembangan dan pemeliharaan:

```text
Hairay/
├── index.html          # Kerangka UI & Entry Point
├── css/
│   └── style.css       # Visual styling
└── js/
    ├── app.js          # Controller & Event Listeners
    ├── state.js        # Penyimpanan data terpusat (State Management)
    ├── utils.js        # Fungsi pembantu (Helper)
    ├── generator.js    # Kalkulasi matematika & posisi helai rambut
    └── renderer.js     # Logika penggambaran (rendering) ke Canvas 2D
