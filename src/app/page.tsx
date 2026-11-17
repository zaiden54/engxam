import Link from "next/link";

const steps = [
  ["01", "Литература", "Соберите научные статьи и монографии по теме исследования. Сохраните PDF и укажите объём прочитанного.", "PDF и сведения об источнике"],
  ["02", "Словарь терминов", "Записывайте термины с переводом, определением и контекстом. Добавляйте по одному или списком из таблицы.", "Термины из вашей литературы"],
  ["03", "Обсуждение с преподавателем", "Подготовьте прочитанные материалы и новые термины для обсуждения. Преподаватель подтверждает результат.", "Зачёт объёма и допуск к экзамену"],
];
export default function Home() {
  return <>
    <section className="page-heading"><h1>Большая цель. Последовательная подготовка.</h1><p className="lead">Литература по вашему исследованию, словарь терминов и работа с преподавателем — в одном учебном пространстве.</p><div className="heading-actions"><Link className="button primary" href="/login">Перейти к входу</Link><span className="muted">Доступ выдаёт администратор группы</span></div></section>
    <section aria-labelledby="preparation-title"><div className="section-heading"><h2 id="preparation-title">Как устроена подготовка</h2><span className="muted">От источников к результату</span></div><div className="preparation-list">{steps.map(([number,title,text,label]) => <article className="preparation-row" key={number}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><span className="card-label">{label}</span></article>)}</div></section>
    <section className="requirements" aria-labelledby="goals"><div className="section-heading"><h2 id="goals">Требования к подготовке</h2><span className="muted">Ориентиры для допуска</span></div><div className="requirements-grid"><div><strong>600 000</strong><span>знаков принятой литературы</span></div><div><strong>500</strong><span>принятых терминов</span></div><p>Загрузка материалов и добавление терминов не означают зачёт. Результаты подтверждает преподаватель.</p></div></section>
    <aside className="notice" role="note"><p><strong>Начните с личного кабинета.</strong> Откройте своё учебное назначение, чтобы перейти к библиотеке и словарю. Если назначение ещё не появилось, обратитесь к администратору группы.</p></aside>
  </>;
}
