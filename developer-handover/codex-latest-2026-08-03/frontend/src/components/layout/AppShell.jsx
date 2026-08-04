import Link from "next/link";
import { useRouter } from "next/router";
import { Bell, Sparkles } from "lucide-react";
import { primaryRoutes, quickRoutes } from "../../utils/routes";

export default function AppShell({ children, title, eyebrow, actions }) {
  const router = useRouter();
  const isActive = (href) =>
    href === "/" ? router.pathname === "/" : router.pathname.startsWith(href);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link className="brand" href="/">
          <span className="brand-mark">D1</span>
          <span>Destiny<span>One</span></span>
        </Link>
        <p className="brand-note">Meaningful connections.<br />Extraordinary futures.</p>
        <nav className="side-nav">
          {primaryRoutes.map(({ href, label, icon: Icon }) => (
            <Link className={isActive(href) ? "nav-link active" : "nav-link"} href={href} key={href}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
          {quickRoutes.map(({ href, label, icon: Icon }) => (
            <Link className="nav-link" href={href} key={href}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="premium-panel">
          <Sparkles size={24} />
          <strong>DestinyOne Premium</strong>
          <p>More intentional introductions and thoughtful tools.</p>
          <Link href="/membership">Explore plans</Link>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <Link className="icon-button" href="/notifications" aria-label="Notifications">
              <Bell size={21} />
              <span className="notification-dot">3</span>
            </Link>
            {actions}
            <Link className="avatar-button" href="/profile" aria-label="Open profile">S</Link>
          </div>
        </header>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {primaryRoutes.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link className={isActive(href) ? "bottom-link active" : "bottom-link"} href={href} key={href}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
