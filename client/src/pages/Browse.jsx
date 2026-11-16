import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getListings } from '../api/listings';
import ListingCard from '../components/ListingCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../hooks/useToast';
import './Browse.css';

const Browse = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('open'); // default 'open' shows available listings
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 300);
  const { showToast } = useToast();
  const isInitialMount = useRef(true);

  const fetchListings = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = {
          page,
          limit: 12
        };

        if (debouncedSearch && debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }

        if (category && category !== 'all') {
          params.category = category;
        }

        if (status && status !== 'all') {
          params.status = status;
        }

        const res = await getListings(params);

        // Resilient unwrapping of listings data
        let items = [];
        let totalP = 1;

        if (Array.isArray(res)) {
          items = res;
        } else if (res && Array.isArray(res.data)) {
          items = res.data;
        } else if (res && Array.isArray(res.listings)) {
          items = res.listings;
        } else if (res?.data && Array.isArray(res.data.listings)) {
          items = res.data.listings;
        }

        if (res?.pagination?.pages) {
          totalP = res.pagination.pages;
        } else if (res?.data?.pagination?.pages) {
          totalP = res.data.pagination.pages;
        } else if (res?.totalPages) {
          totalP = res.totalPages;
        } else {
          totalP = Math.max(1, Math.ceil(items.length / 12));
        }

        setListings(items);
        setTotalPages(totalP);
      } catch (err) {
        console.error('Failed to fetch listings:', err);
        setError(err.message || 'Unable to load food listings. Please try again.');
        if (!isSilent) {
          showToast(err.message || 'Failed to load listings', 'error');
        }
      } finally {
        if (!isSilent) {
          setIsLoading(false);
        }
      }
    },
    [debouncedSearch, category, status, page, showToast]
  );

  // Fetch when filters or page change
  useEffect(() => {
    fetchListings(false);
  }, [fetchListings]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
    }
  }, [debouncedSearch, category, status]);

  // Auto-refresh every 30 seconds silently (no spinner)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchListings(true);
    }, 30000);

    return () => clearInterval(timer);
  }, [fetchListings]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container main-content">
      <div className="browse-page">
        {/* Hero Section */}
        <section className="browse-hero">
          <h1 className="browse-hero__title">
            Share food, <span>not waste</span>
          </h1>
          <p className="browse-hero__subtitle">
            Connect directly with local restaurants, bakeries, markets, and neighbors
            to rescue surplus food before it's too late. Every meal saved matters.
          </p>
          <div className="browse-hero__actions">
            <Link to="/donate" className="btn btn-accent">
              Donate food
            </Link>
            <Link to="/pickup" className="btn btn-secondary">
              Find my pickup
            </Link>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="browse-controls" aria-label="Search and filter listings">
          <div className="browse-search">
            <span className="browse-search__icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="text"
              className="browse-search__input"
              placeholder="Search by food name, description, or donor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search food listings"
            />
          </div>

          <div className="browse-filters">
            <div className="browse-filter-group">
              <label htmlFor="category-select">Category:</label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                <option value="cooked">Cooked meals</option>
                <option value="packaged">Packaged goods</option>
                <option value="produce">Fresh produce</option>
                <option value="bakery">Bakery & pastries</option>
                <option value="other">Other items</option>
              </select>
            </div>

            <div className="browse-filter-group">
              <label htmlFor="status-select">Availability:</label>
              <select
                id="status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">Open (Available now)</option>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="sold_out">Sold out</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </section>

        {/* Content Area */}
        <section aria-label="Available food listings">
          {isLoading ? (
            <Spinner message="Loading delicious surplus food..." />
          ) : error ? (
            <div className="browse-error" role="alert">
              <h2 className="browse-error__title">Could not load food listings</h2>
              <p className="browse-error__msg">{error}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fetchListings(false)}
              >
                Try again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="browse-empty">
              <div className="browse-empty__icon" aria-hidden="true">
                🥣
              </div>
              <h2 className="browse-empty__title">No listings found</h2>
              <p className="browse-empty__desc">
                {searchTerm || category !== 'all' || status !== 'open'
                  ? 'Try adjusting your search criteria or resetting the filters to discover more food.'
                  : 'There are no surplus listings available right now. Check back shortly or share food with your community!'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(searchTerm || category !== 'all' || status !== 'open') && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearchTerm('');
                      setCategory('all');
                      setStatus('open');
                    }}
                  >
                    Reset filters
                  </button>
                )}
                <Link to="/donate" className="btn btn-primary">
                  Post a food donation
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="browse-grid">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing._id || listing.id}
                    listing={listing}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                pages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Browse;
