import React from 'react';
import './Pagination.css';

const Pagination = ({ page = 1, pages = 1, onPageChange }) => {
  if (pages <= 1) return null;

  const currentPage = Math.max(1, Math.min(page, pages));

  // Determine which page numbers to render
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        &larr; Prev
      </button>

      {pageNumbers.map((p, idx) => {
        if (p === '...') {
          return (
            <span key={`dots-${idx}`} className="pagination__ellipsis">
              &hellip;
            </span>
          );
        }

        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            className={`pagination__btn ${isCurrent ? 'pagination__btn--active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        className="pagination__btn"
        disabled={currentPage >= pages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        Next &rarr;
      </button>
    </nav>
  );
};

export default Pagination;
