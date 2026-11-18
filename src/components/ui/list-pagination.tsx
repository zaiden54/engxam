import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "./pagination";

export function ListPagination({ label, page, previous, next }: {
  label: string;
  page: number;
  previous?: string;
  next?: string;
}) {
  return <Pagination aria-label={label}>
    <PaginationContent className="flex-wrap justify-center">
      {previous && <PaginationItem><PaginationPrevious href={previous} aria-label="Предыдущая страница" text="Предыдущая страница" /></PaginationItem>}
      <PaginationItem><span aria-current="page" className="px-2">Страница {page}</span></PaginationItem>
      {next && <PaginationItem><PaginationNext href={next} aria-label="Следующая страница" text="Следующая страница" /></PaginationItem>}
    </PaginationContent>
  </Pagination>;
}
