import { notFound } from "next/navigation";
import { GuestShell } from "@/components/site-shell";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, StatusMessage } from "@/components/ui/states";
export default function Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <GuestShell><h1>Компоненты интерфейса</h1><p>Демонстрация состояний, без учебных данных.</p>
    <Dialog trigger="Открыть диалог" title="Проверка диалога"><p>Закрытие кнопкой или Escape возвращает фокус на исходное действие.</p></Dialog>
    <EmptyState title="Пока нет материалов">Добавленные материалы появятся здесь.</EmptyState>
    <StatusMessage kind="success">Изменения сохранены.</StatusMessage><StatusMessage kind="error">Не удалось сохранить изменения. Повторите попытку.</StatusMessage>
    <div className="skeleton" role="status" aria-label="Загрузка списка" />
    <div className="responsive-table"><table><caption>Пример представления списка</caption><thead><tr><th scope="col">Раздел</th><th scope="col">Состояние</th></tr></thead><tbody><tr><td data-label="Раздел">Литература</td><td data-label="Состояние">Пока пусто</td></tr></tbody></table></div>
  </GuestShell>;
}
