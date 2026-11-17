"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="card" role="alert"><h1>Не удалось открыть страницу</h1><p>Попробуйте ещё раз. Если ошибка повторяется, обратитесь к администратору.</p><button className="button primary" onClick={reset}>Повторить</button></section>; }
