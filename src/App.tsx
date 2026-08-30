import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import AdminLayout from "./layouts/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import PegawaiPage from "./pages/admin/PegawaiPage";
import KatalogModelPage from "./pages/admin/KatalogModelPage";
import AktivitasPage from "./pages/admin/AktivitasPage";
import UnitHpPage from "./pages/admin/UnitHpPage";
import PembelianPage from "./pages/admin/PembelianPage";
import PenjualanPage from "./pages/admin/PenjualanPage";
import KomisiPage from "./pages/admin/KomisiPage";
import { AdminGuard, GuestRoute } from "./routes/guards";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Admin — layout + nested pages, mirror html sidebar nav */}
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/pegawai" element={<PegawaiPage />} />
          <Route path="/admin/katalog-model" element={<KatalogModelPage />} />
          <Route path="/admin/aktivitas" element={<AktivitasPage />} />
          <Route path="/admin/aturan-komisi" element={<AktivitasPage />} />
          {/* alias legacy */}
          <Route path="/admin/unit-hp" element={<UnitHpPage />} />
          <Route path="/admin/pembelian" element={<PembelianPage />} />
          <Route path="/admin/penjualan" element={<PenjualanPage />} />
          <Route path="/admin/komisi" element={<KomisiPage />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
