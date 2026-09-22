"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const TABS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/casa", label: "Casa", icon: "casa" },
  { href: "/historial", label: "Historial", icon: "list" },
  { href: "/cuentas", label: "Cuentas", icon: "scale" },
  { href: "/sobres", label: "Sobres", icon: "sliders" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => {
        const on = path === t.href;
        return (
          <Link key={t.href} href={t.href} className={on ? "tab on" : "tab"} aria-current={on ? "page" : undefined}>
            <Icon name={t.icon} stroke={on ? 2.4 : 2} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
