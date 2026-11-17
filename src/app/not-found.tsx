import Link from "next/link";
export default function NotFound() { return <section className="card"><p className="eyebrow">404</p><h1>Страница не найдена</h1><Link className="button primary" href="/">К обзору приложения</Link></section>; }
