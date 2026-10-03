import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080/api";
const USER_ID = 1;

function App() {
  const [products, setProducts] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [historyByProduct, setHistoryByProduct] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/products/user/${USER_ID}`);

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();
      setProducts(data);

      const histories = {};

      await Promise.all(
        data.map(async (product) => {
          try {
            const historyResponse = await fetch(
              `${API_BASE}/products/${product.id}/price-history`,
            );

            histories[product.id] = historyResponse.ok
              ? await historyResponse.json()
              : [];
          } catch {
            histories[product.id] = [];
          }
        }),
      );

      setHistoryByProduct(histories);
    } catch {
      setError(
        "Could not connect to the backend. Make sure Spring Boot is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function importProduct(event) {
    event.preventDefault();

    if (!url.trim()) {
      setError("Please enter a product URL.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE}/products/import?url=${encodeURIComponent(
          url,
        )}&userId=${USER_ID}`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Product import failed");
      }

      const product = await response.json();

      setProducts((current) => [...current, product]);
      setHistoryByProduct((current) => ({
        ...current,
        [product.id]: [],
      }));
      setUrl("");
      setMessage("Product added successfully.");
    } catch {
      setError(
        "Could not import the product. Check the URL and make sure Firecrawl is available.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function checkPrice(productId) {
    try {
      setCheckingId(productId);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE}/products/${productId}/check-price`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Price check failed");
      }

      const updatedProduct = await response.json();

      const historyResponse = await fetch(
        `${API_BASE}/products/${updatedProduct.id}/price-history`,
      );

      if (historyResponse.ok) {
        const updatedHistory = await historyResponse.json();
        setHistoryByProduct((current) => ({
          ...current,
          [updatedProduct.id]: updatedHistory,
        }));
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );

      setMessage("Price checked successfully.");
    } catch {
      setError("Could not check the product price.");
    } finally {
      setCheckingId(null);
    }
  }

  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this product?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(productId);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      );

      setHistoryByProduct((current) => {
        const updated = { ...current };
        delete updated[productId];
        return updated;
      });

      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
        setPriceHistory([]);
      }

      setMessage("Product removed.");
    } catch {
      setError("Could not delete the product.");
    } finally {
      setDeletingId(null);
    }
  }

  async function showHistory(product) {
    try {
      setSelectedProduct(product);
      setHistoryLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/products/${product.id}/price-history`,
      );

      if (!response.ok) {
        throw new Error("History request failed");
      }

      const data = await response.json();
      setPriceHistory(data);
    } catch {
      setError("Could not load price history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  }

  function formatPrice(price) {
    const value = Number(price);
    return Number.isFinite(value) ? value.toFixed(2) : "—";
  }

  function getProductStats(product) {
    const history = historyByProduct[product.id] || [];
    const prices = history
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price));

    if (!prices.length) {
      return {
        lowestPrice: Number(product.currentPrice),
        change: 0,
        dropped: false,
        points: 0,
      };
    }

    const lowestPrice = Math.min(...prices);
    const firstPrice = prices[0];
    const currentPrice = Number(product.currentPrice);
    const change =
      firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;

    return {
      lowestPrice,
      change,
      dropped: currentPrice < firstPrice,
      points: prices.length,
    };
  }

  const dashboardStats = useMemo(() => {
    let drops = 0;
    let points = 0;

    products.forEach((product) => {
      const stats = getProductStats(product);
      if (stats.dropped) drops += 1;
      points += stats.points;
    });

    return {
      products: products.length,
      drops,
      points,
    };
  }, [products, historyByProduct]);

  function openProduct(productUrl) {
    window.open(productUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">D</div>
          <div>
            <h1>DBestHunt</h1>
            <p>Hunt the price. Catch the deal.</p>
          </div>
        </div>

        <button
          className="refresh-button"
          onClick={loadProducts}
          disabled={loading}
        >
          ↻ {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">PRICE TRACKER</span>
            <h2>Stop overpaying. Start hunting smarter.</h2>
            <p>
              Add a product URL and DBestHunt will track its price, maintain its
              history, and alert you when the price falls.
            </p>
          </div>

          <div className="hero-visual" aria-label="Price drop example">
            <div className="hero-visual-top">
              <span>DEAL DETECTED</span>
              <strong>↓</strong>
            </div>
            <div className="hero-price">
              <span>PRICE DROP</span>
              <div>
                <strong>60.00</strong>
                <em>→ 51.77</em>
              </div>
            </div>
            <div className="hero-chip">Hunt the deal</div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span>TRACKED PRODUCTS</span>
            <strong>{dashboardStats.products}</strong>
            <small>Currently monitored</small>
          </div>
          <div className="stat-card">
            <span>PRICE DROPS</span>
            <strong>{dashboardStats.drops}</strong>
            <small>Products below first check</small>
          </div>
          <div className="stat-card">
            <span>PRICE POINTS</span>
            <strong>{dashboardStats.points}</strong>
            <small>Saved in price history</small>
          </div>
        </section>

        <section className="import-card">
          <div className="import-copy">
            <div className="import-icon">↗</div>
            <div>
              <span className="eyebrow">START TRACKING</span>
              <h3>Add a product</h3>
              <p>
                Paste a product URL and we'll fetch its details and current
                price.
              </p>
            </div>
          </div>

          <form onSubmit={importProduct} className="import-form">
            <input
              type="url"
              placeholder="https://example.com/product"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              disabled={importing}
            />
            <button type="submit" disabled={importing}>
              {importing ? "Adding..." : "Add Product"}
            </button>
          </form>
        </section>

        {message && <div className="message success">{message}</div>}
        {error && <div className="message error">{error}</div>}

        <section className="products-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR PRODUCTS</span>
              <h2>Tracked products</h2>
            </div>
            <span className="count">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Loading your products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">＋</div>
              <h3>No products yet</h3>
              <p>Add a product URL above to start tracking its price.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => {
                const stats = getProductStats(product);

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} />
                      ) : (
                        <div className="no-image">No image</div>
                      )}

                      {stats.dropped && (
                        <div className="deal-badge">↓ PRICE DROP</div>
                      )}
                    </div>

                    <div className="product-content">
                      <div className="product-title-row">
                        <h3>{product.name}</h3>
                        {stats.dropped && <span className="drop-dot"></span>}
                      </div>

                      <p className="product-url">{product.url}</p>

                      <div className="price-row">
                        <div className="price">
                          <span>{product.currency}</span>
                          {formatPrice(product.currentPrice)}
                        </div>

                        {stats.change !== 0 && (
                          <div
                            className={
                              stats.change < 0
                                ? "price-change down"
                                : "price-change up"
                            }
                          >
                            {stats.change < 0 ? "↓" : "↑"}{" "}
                            {Math.abs(stats.change).toFixed(1)}%{" "}
                            <span>since first check</span>
                          </div>
                        )}
                      </div>

                      <div className="lowest-price">
                        <span>Lowest tracked price</span>
                        <strong>
                          {product.currency} {formatPrice(stats.lowestPrice)}
                        </strong>
                      </div>

                      <p className="updated">
                        Updated {formatDate(product.updatedAt)}
                      </p>

                      <div className="actions">
                        <button
                          onClick={() => checkPrice(product.id)}
                          disabled={checkingId === product.id}
                        >
                          {checkingId === product.id
                            ? "Checking..."
                            : "Check Price"}
                        </button>

                        <button
                          className="secondary"
                          onClick={() => showHistory(product)}
                        >
                          History
                        </button>

                        <button
                          className="view-product"
                          onClick={() => openProduct(product.url)}
                        >
                          View ↗
                        </button>

                        <button
                          className="danger"
                          onClick={() => deleteProduct(product.id)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {selectedProduct && (
          <section className="history-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PRICE HISTORY</span>
                <h2>{selectedProduct.name}</h2>
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setSelectedProduct(null);
                  setPriceHistory([]);
                }}
              >
                Close
              </button>
            </div>

            {historyLoading ? (
              <div className="history-loading">Loading price history...</div>
            ) : priceHistory.length === 0 ? (
              <div className="history-loading">
                No price history available yet.
              </div>
            ) : (
              <PriceHistoryPanel
                history={priceHistory}
                currency={selectedProduct.currency}
                formatDate={formatDate}
                formatPrice={formatPrice}
              />
            )}
          </section>
        )}
      </main>

      <footer>
        <p>DBestHunt · Smart Product Price Tracking</p>
      </footer>
    </div>
  );
}

function PriceHistoryPanel({ history, currency, formatDate, formatPrice }) {
  const points = history
    .map((entry) => ({
      price: Number(entry.price),
      date: entry.recordedAt,
    }))
    .filter((point) => Number.isFinite(point.price));

  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const width = 760;
  const height = 240;
  const padX = 28;
  const padY = 24;
  const chartWidth = width - padX * 2;
  const chartHeight = height - padY * 2;

  const chartPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padX + (index / (points.length - 1)) * chartWidth;
    const y = padY + ((max - point.price) / range) * chartHeight;
    return { ...point, x, y };
  });

  const path = chartPoints
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");

  const first = points[0].price;
  const latest = points[points.length - 1].price;
  const change = first > 0 ? ((latest - first) / first) * 100 : 0;

  return (
    <div className="history-panel">
      <div className="history-summary">
        <div>
          <span>LOWEST</span>
          <strong>
            {currency} {formatPrice(min)}
          </strong>
        </div>
        <div>
          <span>HIGHEST</span>
          <strong>
            {currency} {formatPrice(max)}
          </strong>
        </div>
        <div>
          <span>SINCE FIRST CHECK</span>
          <strong className={change <= 0 ? "summary-down" : "summary-up"}>
            {change < 0 ? "↓" : change > 0 ? "↑" : "—"}{" "}
            {Math.abs(change).toFixed(1)}%
          </strong>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">PRICE MOVEMENT</span>
            <h3>Tracked price</h3>
          </div>
          <span>
            {points.length} price point{points.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="chart-wrap">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Price history chart"
          >
            <line
              x1={padX}
              y1={padY}
              x2={padX}
              y2={height - padY}
              className="chart-axis"
            />
            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              className="chart-axis"
            />
            <line
              x1={padX}
              y1={padY}
              x2={width - padX}
              y2={padY}
              className="chart-grid"
            />
            <line
              x1={padX}
              y1={height / 2}
              x2={width - padX}
              y2={height / 2}
              className="chart-grid"
            />
            {chartPoints.length > 1 && (
              <path d={path} className="chart-line" fill="none" />
            )}
            {chartPoints.map((point, index) => (
              <g key={`${point.date}-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  className="chart-point"
                />
                {index === chartPoints.length - 1 && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="11"
                    className="chart-ring"
                  />
                )}
              </g>
            ))}
          </svg>
        </div>

        <div className="chart-labels">
          <span>{formatDate(points[0].date)}</span>
          <span>{formatDate(points[points.length - 1].date)}</span>
        </div>
      </div>

      <div className="history-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Price</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {history
              .slice()
              .reverse()
              .map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.recordedAt)}</td>
                  <td>{formatPrice(entry.price)}</td>
                  <td>{entry.currency}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
