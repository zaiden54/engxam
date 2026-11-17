import Link from "next/link";

export function StudyNavigation({ enrollmentId, current }: { enrollmentId: string; current: "library" | "glossary" }) {
  return <nav className="study-navigation" aria-label="Разделы подготовки">
    <Link href="/account">← Личный кабинет</Link>
    <div><Link href={`/library?enrollmentId=${enrollmentId}`} aria-current={current === "library" ? "page" : undefined}>Литература</Link>
      <Link href={`/glossary?enrollmentId=${enrollmentId}`} aria-current={current === "glossary" ? "page" : undefined}>Словарь терминов</Link></div>
  </nav>;
}
