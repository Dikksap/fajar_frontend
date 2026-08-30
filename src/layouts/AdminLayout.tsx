import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type NavGroup = {
  label: string;
  icon: string;
  items: { to: string; label: string; icon: string; end?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Navigasi",
    icon: "explore",
    items: [
      { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
    ],
  },
  {
    label: "Manajemen",
    icon: "settings",
    items: [
      { to: "/admin/katalog-model", label: "Katalog Model", icon: "phone_iphone" },
      { to: "/admin/pegawai", label: "Pegawai", icon: "badge" },
      { to: "/admin/aktivitas", label: "Aktivitas", icon: "bolt" },
    ],
  },
  {
    label: "Transaksi",
    icon: "swap_horiz",
    items: [
      { to: "/admin/pembelian", label: "Pembelian", icon: "shopping_bag" },
      { to: "/admin/penjualan", label: "Penjualan", icon: "point_of_sale" },
    ],
  },
  {
    label: "Inventaris",
    icon: "inventory_2",
    items: [
      { to: "/admin/unit-hp", label: "Unit HP", icon: "inventory_2" },
    ],
  },
  {
    label: "Keuangan",
    icon: "account_balance",
    items: [
      { to: "/admin/komisi", label: "Komisi", icon: "payments" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Navigasi", "Transaksi"]));

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Auto-open group containing active route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((item) => {
        if (item.end) return location.pathname === item.to;
        return location.pathname.startsWith(item.to);
      })
    );
    if (activeGroup) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        next.add(activeGroup.label);
        return next;
      });
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return to !== "/admin" && location.pathname.startsWith(to);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex overflow-x-hidden">
      <style>{`
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .material-symbols-outlined.filled { font-variation-settings: 'FILL' 1; }
        .sidebar-transition { transition: width 0.3s ease-in-out, transform 0.3s ease-in-out; }
        .main-transition { transition: margin-left 0.3s ease-in-out; }
        .group-chevron { transition: transform 0.25s ease; }
        .group-chevron.open { transform: rotate(180deg); }
        .nav-items-enter { transition: max-height 0.25s ease, opacity 0.2s ease; }
        .sidebar-collapsed .group-label { display: none; }
        .sidebar-collapsed .group-chevron { display: none; }
        .sidebar-collapsed .nav-item { justify-content: center; padding-left: 0; padding-right: 0; }
        .sidebar-collapsed .nav-icon-only { display: none; }
        .sidebar-collapsed .text-hide { display: none; }
        .ambient-shadow-sm { box-shadow: 0px 2px 4px rgba(0,0,0,0.05); }
      `}</style>

      {/* Sidebar */}
      <aside
        className={`sidebar-transition fixed left-0 top-0 h-full flex flex-col z-40 bg-surface border-r border-outline-variant pt-[72px] ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ width: collapsed ? "72px" : "248px" }}
      >
        {/* Brand */}
        <div className="px-4 mb-4 flex items-center gap-3">
          <img
            alt="Logo"
            className="w-9 h-9 rounded-sm object-cover shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTDXqPTA4BBmC6mORmRV6QuYHaqiXta5sOMfx4f536jLSeYudvNgbUba3D95UpQc8sGZjiuCUBfMAGzkRKDqroWVgw_xlAMd2k49f9A7M5YLwWRqSi8XWYZeztySwqwdJ35BMoejC90uc6-onFedX5AaHng2t8SCYLTuEe7Uh4fXyDAToKJokir913ak2cUA6oCptn7tPnN19vtHcLpx-spDjCCHM2vLsvX3hfFzuDp8qR5BA7dSYwRQ"
          />
          <div className="text-hide overflow-hidden">
            <div className="text-sm font-bold text-on-surface leading-none truncate">Inventory Pro</div>
            <div className="text-xs text-on-surface-variant leading-none truncate">Premium Electronics</div>
          </div>
        </div>

        {/* Quick add */}
        <div className="px-3 mb-4">
          <a href="/admin/pembelian" className="w-full bg-primary text-on-primary text-sm font-medium py-2 px-3 rounded-sm hover:bg-primary-container hover:text-on-primary-container transition flex items-center justify-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="text-hide">Tambah Produk</span>
          </a>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 px-2 flex flex-col gap-1 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups.has(group.label);
            const hasActive = group.items.some((item) => isActive(item.to, item.end));
            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition group-label
                    ${hasActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${hasActive ? "filled" : ""} text-primary`}>{group.icon}</span>
                  <span className="flex-1 text-left">{group.label}</span>
                  <span className={`material-symbols-outlined text-[16px] group-chevron ${isOpen ? "open" : ""}`}>expand_more</span>
                </button>

                {/* Group items */}
                <div className={`nav-items-enter overflow-hidden ${isOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
                  {group.items.map((item) => {
                    const active = isActive(item.to, item.end);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={() =>
                          `flex items-center gap-3 mx-1 px-3 py-2 rounded-lg text-sm font-medium transition nav-item nav-icon-only
                          ${active ? "bg-primary/10 text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`
                        }
                      >
                        <span className={`material-symbols-outlined text-[18px] ${active ? "filled" : ""}`}>{item.icon}</span>
                        <span className="text-hide">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 mt-auto pt-4 border-t border-outline-variant mx-3 mb-4 flex flex-col gap-1">
          <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-sm font-medium transition nav-item">
            <span className="material-symbols-outlined">help</span>
            <span className="text-hide">Pusat Bantuan</span>
          </a>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg text-sm font-medium transition nav-item w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-hide">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-on-background/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className={`flex-1 flex flex-col min-h-screen main-transition ${collapsed ? "md:ml-[72px]" : "md:ml-[248px]"}`}>
        <div className="flex-1 flex flex-col min-h-screen">
          {/* TopNav */}
          <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 md:px-6 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
            <div className={`flex items-center gap-3 main-transition ${collapsed ? "md:pl-[80px]" : "md:pl-[264px]"}`}>
              <button onClick={() => setMobileOpen((v) => !v)} className="p-2 rounded-sm hover:bg-surface-container-low transition text-on-surface-variant md:hidden">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <button onClick={() => setCollapsed((v) => !v)} className="hidden md:grid place-items-center p-2 rounded-sm hover:bg-surface-container-low transition text-on-surface-variant">
                <span className="material-symbols-outlined">{collapsed ? "menu_open" : "menu"}</span>
              </button>
              <span className="text-xl font-bold text-primary tracking-tight hidden sm:block">LuxeInventory</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="relative hidden sm:flex items-center">
                <span className="material-symbols-outlined absolute left-2 text-on-surface-variant pointer-events-none text-[20px]">search</span>
                <input className="pl-9 pr-3 py-2 rounded-sm border border-outline-variant bg-surface-bright focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-sm w-48 md:w-64" placeholder="Cari inventaris..." type="text" />
              </div>
              <button className="sm:hidden p-2 rounded-sm hover:bg-surface-container-low transition text-on-surface-variant">
                <span className="material-symbols-outlined">search</span>
              </button>
              <button className="p-2 rounded-sm hover:bg-surface-container-low transition text-on-surface-variant">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 rounded-sm hover:bg-surface-container-low transition text-on-surface-variant hidden sm:block">
                <span className="material-symbols-outlined">settings</span>
              </button>
              <div className="hidden sm:flex flex-col items-end ml-1">
                <span className="text-sm font-medium text-on-surface leading-none max-w-[140px] truncate">{user?.name}</span>
                <span className="text-xs text-on-surface-variant leading-none">{user?.role}</span>
              </div>
              <img
                alt="Profile"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-outline-variant ml-1"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXQx-J_vAZGErgekgdTOHU5voAc8S3s-NUv2K7y9Y2AtWbY8J5eBXBzZC-R3Qxg9nsCLnC0-RJ6mja94wKu-se6rw0eeknh6lc-Je8KB70fI0nRH-mXdb8WRpJz84a2pPA6wm5oWb9XkYqNlpN7FmD7Ia55WI9gPDHS3RUPG9O4Dfru87YNBAswUyyhpk6ME7HhBjJ_knRHBvbFziKQVWkFw8Z1QX-oFbZ3am7xor207sA9-cSy30EIA"
              />
            </div>
          </header>

          {/* Content */}
          <main className="pt-20 md:pt-24 px-4 md:px-6 lg:px-10 pb-10 max-w-[1280px] mx-auto w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
