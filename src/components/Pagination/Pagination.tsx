import React from 'react';
import { useAppContext } from '../../context/AppContext';
import styles from './Pagination.module.scss';

export function Pagination() {
  const { state, dispatch } = useAppContext();
  const { currentPage, totalPages } = state;

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      dispatch({ type: 'SET_PAGE', payload: page });
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.pageButton} ${styles.navButton}`}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一頁
      </button>

      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className={styles.ellipsis}>...</span>
          ) : (
            <button
              className={`${styles.pageButton} ${page === currentPage ? styles.active : ''}`}
              onClick={() => handlePageChange(page as number)}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        className={`${styles.pageButton} ${styles.navButton}`}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一頁
      </button>

      <span className={styles.pageInfo}>
        第 {currentPage} 頁，共 {totalPages} 頁
      </span>
    </div>
  );
}