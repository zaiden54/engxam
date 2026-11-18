import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

const format = new Intl.NumberFormat("ru-RU");

function StudyProgress({ label, title = label, amount, target, unit, detail }: {
  label: string; title?: string; amount: bigint; target: number; unit: string; detail: ReactNode;
}) {
  const value = Math.max(0, Number(amount > BigInt(target) ? BigInt(target) : amount));
  const text = `${format.format(amount)} из ${format.format(target)} ${unit}`;
  return <section className="study-progress">
    <h2>{title}</h2>
    {title !== label && <p className="study-progress-caption">{label}</p>}
    <p className="study-progress-value"><strong>{format.format(amount)}</strong><span> из {format.format(target)} {unit}</span></p>
    <Progress className="h-2" value={value} max={target} aria-label={label} aria-valuetext={text}/>
    <p className="study-progress-detail">{detail}</p>
  </section>;
}

export function SourceProgress({ count, characters, title }: { count: number; characters: string; title?: string }) {
  return <StudyProgress label="Заявленный объём источников" title={title} amount={BigInt(characters)} target={600_000} unit="знаков"
    detail={<>Источников: {format.format(count)}. Для зачёта объём подтверждает преподаватель.</>}/>;
}

export function TermProgress({ total, drafts, title }: { total: number; drafts: number; title?: string }) {
  return <StudyProgress label="Термины с переводом" title={title} amount={BigInt(total - drafts)} target={500} unit="терминов"
    detail={<>Всего терминов: {format.format(total)}, из них черновиков: {format.format(drafts)}. Для зачёта термины подтверждает преподаватель.</>}/>;
}
