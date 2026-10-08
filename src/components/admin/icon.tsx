export function AdminIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="admin-icon" viewBox="0 0 24 24" aria-hidden="true">
      {name === "home" ? <path {...common} d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /> : null}
      {name === "products" ? <path {...common} d="M6 7h12l-1 13H7L6 7zm3 0V5a3 3 0 0 1 6 0v2" /> : null}
      {name === "orders" ? <path {...common} d="M7 4h10v16H7zM9 8h6M9 12h6M9 16h4" /> : null}
      {name === "customers" ? <path {...common} d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12zm-6 8a6 6 0 0 1 12 0" /> : null}
      {name === "discount" ? <path {...common} d="M4 12V5h7l9 9-7 7zm3-4.5a1.5 1.5 0 1 0 1.5-1.5A1.5 1.5 0 0 0 7 7.5z" /> : null}
      {name === "truck" ? <path {...common} d="M3 7h11v8H3zm11 2h4l3 3v3h-7zM7 19a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm10 0a2 2 0 1 0-2-2 2 2 0 0 0 2 2z" /> : null}
      {name === "category" ? <path {...common} d="M4 5h7v7H4zm9 0h7v7h-7zM4 14h7v5H4zm9 0h7v5h-7z" /> : null}
      {name === "brand" ? <path {...common} d="M12 3 5 7v10l7 4 7-4V7zm0 6 5-2.5M12 9v8" /> : null}
      {name === "offer" ? <path {...common} d="M5 5h9l5 5-9 9-5-5zm3 3.5a1.2 1.2 0 1 0 1.2-1.2A1.2 1.2 0 0 0 8 8.5z" /> : null}
      {name === "ribbon" ? <path {...common} d="M4 8h16M6 12h12M8 16h8" /> : null}
      {name === "stack" ? <path {...common} d="M8 4h12v4H8zM6 9h12v4H6zM4 14h12v6H4z" /> : null}
      {name === "collage" ? <path {...common} d="M4 4h16v6H4zM4 14h7v6H4zm9 0h7v6h-7z" /> : null}
      {name === "pages" ? <path {...common} d="M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6" /> : null}
      {name === "mail" ? <path {...common} d="M4 6h16v12H4zm0 0 8 7 8-7" /> : null}
      {name === "settings" ? <path {...common} d="M12 8.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5zM4 12h2M18 12h2M12 4v2M12 18v2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" /> : null}
    </svg>
  );
}
