import Icon from "@/components/ui/Icon";

export default function Pagination({ page, totalPages, total, onPrevious, onNext }) {
  return <div className="pagination"><span>Page {page} of {totalPages || 1} · {total} total</span><div><button className="page-button" type="button" disabled={page <= 1} onClick={onPrevious}>Previous</button><button className="page-button page-button-next" type="button" disabled={page >= totalPages} onClick={onNext}>Next <Icon name="chevron" size={14} /></button></div></div>;
}
