export function ExperienceBrand({
  light = false,
  admin = false,
}: {
  light?: boolean;
  admin?: boolean;
}) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <path d="M4 6h27L15 23h16v7H4l16-17H4z" fill="currentColor" />
        <path d="M25 6h6v7h-6z" fill="#bbdf79" />
      </svg>
      <span>
        zyteron<span className="brand-dot">.</span>
        <small>{admin ? "ADMINISTRACIÓN" : "PORTAL CLIENTE"}</small>
      </span>
    </div>
  );
}
