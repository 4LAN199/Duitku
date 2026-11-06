DUITKU V2 — STARTER UI

Ekstrak ZIP, lalu buka index.html di browser atau gunakan Live Server di VS Code.
Tema light/dark tersimpan di browser. Tampilan ini masih pratinjau dan BELUM terhubung ke Firebase.
Jangan mengganti website produksi dengan folder ini sebelum integrasi dan pengujian selesai.


PEMBARUAN: PEMILIHAN RUANG KEUANGAN
- Klik kotak RUANG AKTIF di sidebar untuk memilih Duitku Utama atau Duitku Kedua.
- Pilihan ruang disimpan lokal di browser untuk kebutuhan pratinjau.
- Belum ada koneksi Firebase dan belum ada data yang dipindahkan/diubah.
- Kedua ruang masih menampilkan saldo/transaksi contoh kosong; pemisahan database dibuat pada tahap integrasi berikutnya.


Pembaruan modul transaksi, statistik, dan laporan:
- Transaksi pemasukan/pengeluaran dapat ditambah, diedit, dihapus, dicari, dan difilter.
- Statistik menampilkan ringkasan dan diagram donat pengeluaran per kategori.
- Laporan dapat difilter berdasarkan tanggal dan jenis, lalu diekspor ke CSV.
- Data demo disimpan lokal di browser dan dipisahkan per ruang menggunakan localStorage.
- Belum terhubung ke Firebase; jangan gunakan data lokal ini sebagai penyimpanan produksi.


Pembaruan autentikasi (pratinjau lokal):
- Halaman Masuk dan Buat akun dengan validasi email, kata sandi minimal 8 karakter, konfirmasi kata sandi, dan tombol lihat/sembunyikan sandi.
- Pendaftaran dan login demo berjalan pada browser yang sama. Sandi disimpan sebagai hash SHA-256 di localStorage, bukan sebagai teks biasa.
- Sesi demo bertahan setelah halaman dimuat ulang; tombol Keluar mengakhiri sesi.
- Lupa kata sandi hanya menampilkan pemberitahuan bahwa reset akan tersedia setelah Firebase Auth dihubungkan.
- PENTING: Ini BUKAN autentikasi produksi. localStorage dapat dimodifikasi pengguna dan tidak memberikan keamanan server. Jangan gunakan untuk akun/data sungguhan. Tahap berikutnya adalah integrasi Firebase Authentication, pembuatan dokumen profil Firestore, verifikasi email, serta aturan akses ruang keuangan.
- Akun demo hanya tersedia di browser/perangkat tempat pendaftaran dilakukan. Hapus data situs browser dapat menghapus akun demo.
