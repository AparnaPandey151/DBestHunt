import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080/api";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  /*
   * Load the currently authenticated Google user.
   */
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Failed to load current user:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  /*
   * Load products after authentication is complete.
   */
  useEffect(() => {
    if (!authLoading && user) {
      loadProducts();
    }

    if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user]);

  /*
   * Load all products belonging to the logged-in user.
   */
  async function loadProducts() {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/products`, {
        credentials: "include",
      });

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
              {
                credentials: "include",
              },
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
    } catch (error) {
      console.error("Failed to load products:", error);

      setError(
        "Could not connect to the backend. Make sure Spring Boot is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Automatically refresh product prices in the background.
   * This allows backend/database price changes to appear
   * without manually refreshing the browser.
   */
  useEffect(() => {
    if (authLoading || !user) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/products`, {
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const latestProducts = await response.json();

        setProducts(latestProducts);
      } catch (error) {
        console.error("Automatic price refresh failed:", error);
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [authLoading, user]);

  /*
   * Import a new product using Firecrawl.
   */
  async function importProduct(event) {
    event.preventDefault();

    if (!url.trim()) {
      setError("Please enter a product URL.");
      return;
    }

    if (!user) {
      setError("Please sign in before adding a product.");
      return;
    }

    try {
      setImporting(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE}/products/import?url=${encodeURIComponent(url)}`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error("Product import failed:", response.status, errorText);

        throw new Error(
          `Product import failed: ${response.status} ${errorText}`,
        );
      }

      const product = await response.json();

      setProducts((current) => [...current, product]);

      /*
       * The backend creates the initial price-history record
       * during product import.
       */
      setHistoryByProduct((current) => ({
        ...current,
        [product.id]: [
          {
            price: product.currentPrice,
            currency: product.currency,
            recordedAt: product.createdAt,
          },
        ],
      }));

      setUrl("");
      setMessage("Product added successfully.");
    } catch (error) {
      console.error("Import error:", error);

      setError(
        "Could not import the product. Check the product URL and make sure Firecrawl is available.",
      );
    } finally {
      setImporting(false);
    }
  }

  /*
   * Check the latest price of a product.
   *
   * IMPORTANT HISTORY BEHAVIOUR:
   *
   * 1. If history is CLOSED:
   *    Checking a price does NOT open history.
   *
   * 2. If history is OPEN:
   *    - Checking the same product refreshes its history.
   *    - Checking another product switches the open history
   *      panel to that newly checked product.
   */
  async function checkPrice(productId) {
    try {
      setCheckingId(productId);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE}/products/${productId}/check-price`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Price check failed");
      }

      const updatedProduct = await response.json();

      /*
       * Always fetch the latest history because the backend may
       * have added a new price-history record.
       */
      const historyResponse = await fetch(
        `${API_BASE}/products/${updatedProduct.id}/price-history`,
        {
          credentials: "include",
        },
      );

      let updatedHistory = [];

      if (historyResponse.ok) {
        updatedHistory = await historyResponse.json();

        setHistoryByProduct((current) => ({
          ...current,
          [updatedProduct.id]: updatedHistory,
        }));
      }

      /*
       * Update the product card with the latest price.
       */
      setProducts((current) =>
        current.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );

      /*
       * IMPORTANT:
       *
       * Only update the visible history panel if history was
       * already open.
       *
       * If history was closed before Check Price was clicked,
       * it remains closed.
       */
      if (selectedProduct) {
        /*
         * History was already open.
         *
         * This covers BOTH:
         * - checking the same product
         * - checking another product
         *
         * In either case, the visible history becomes the
         * history of the product that was just checked.
         */
        setSelectedProduct(updatedProduct);
        setPriceHistory(updatedHistory);
      }

      setMessage("Price checked successfully.");
    } catch (error) {
      console.error("Price check error:", error);
      setError("Could not check the product price.");
    } finally {
      setCheckingId(null);
    }
  }

  /*
   * Delete a tracked product.
   */
  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this product?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(productId);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
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
    } catch (error) {
      console.error("Delete error:", error);
      setError("Could not delete the product.");
    } finally {
      setDeletingId(null);
    }
  }

  /*
   * Load and display price history.
   *
   * History button:
   * - If history is closed -> opens it.
   * - If history is already open for the same product -> refreshes it.
   * - If history is open for another product -> replaces it with
   *   the selected product's history.
   */
  async function showHistory(product) {
    try {
      setSelectedProduct(product);
      setPriceHistory([]);
      setHistoryLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/products/${product.id}/price-history`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("History request failed");
      }

      const data = await response.json();

      setPriceHistory(data);

      /*
       * Keep the cached history synchronized.
       */
      setHistoryByProduct((current) => ({
        ...current,
        [product.id]: data,
      }));
    } catch (error) {
      console.error("History error:", error);
      setError("Could not load price history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  /*
   * Open the product in a new tab.
   *
   * VIEW BEHAVIOUR:
   * - Always close the currently open history.
   * - Open the product in a new browser tab.
   *
   * View NEVER opens or switches the history panel.
   */
  function openProduct(product) {
    window.open(product.url, "_blank", "noopener,noreferrer");

    setSelectedProduct(null);
    setPriceHistory([]);
    setHistoryLoading(false);
  }

  /*
   * Log the user out.
   */
  function logout() {
    window.location.href = "http://localhost:8080/logout";
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "—";
    }

    return new Date(dateString).toLocaleString();
  }

  function formatPrice(price) {
    const value = Number(price);

    return Number.isFinite(value) ? value.toFixed(2) : "—";
  }

  /*
   * Calculate statistics for an individual product.
   */
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

  /*
   * Dashboard statistics.
   */
  const dashboardStats = useMemo(() => {
    let drops = 0;
    let points = 0;

    products.forEach((product) => {
      const stats = getProductStats(product);

      if (stats.dropped) {
        drops += 1;
      }

      points += stats.points;
    });

    return {
      products: products.length,
      drops,
      points,
    };
  }, [products, historyByProduct]);

  /*
   * Authentication loading screen.
   */
  if (authLoading) {
    return (
      <div className="app">
        <div className="auth-loading">
          <div className="loader"></div>
          <p>Checking your account...</p>
        </div>
      </div>
    );
  }

  /*
   * Signed-out screen.
   */
  if (!user) {
    return (
      <div className="app landing-page">
        <div className="ambient ambient-one"></div>
        <div className="ambient ambient-two"></div>

        <header className="header landing-header">
          <div className="brand">
            <div className="brand-icon">D</div>

            <div>
              <h1>DBestHunt</h1>
              <p>Hunt the price. Catch the deal.</p>
            </div>
          </div>

          <a
            className="login-button"
            href="http://localhost:8080/oauth2/authorization/google"
          >
            Sign In
            <span aria-hidden="true">↗</span>
          </a>
        </header>

        <main className="landing-main">
          <section className="landing-hero container">
            <div className="hero-copy landing-copy">
              <div className="eyebrow-pill">
                <span className="eyebrow-dot"></span>
                SMART PRICE TRACKING
              </div>

              <h2>
                Stop overpaying.
                <span>Start hunting smarter.</span>
              </h2>

              <p>
                Keep an eye on the prices that matter. DBestHunt remembers price
                history, spots drops, and helps you catch the right moment to
                buy.
              </p>

              <div className="hero-points">
                <div>
                  <span>01</span>
                  Track products
                </div>

                <div>
                  <span>02</span>
                  Watch price movement
                </div>

                <div>
                  <span>03</span>
                  Catch the deal
                </div>
              </div>
            </div>

            <div
              className="landing-visual"
              aria-label="DBestHunt price tracking and email alert preview"
            >
              <div className="visual-window">
                <div className="visual-window-top">
                  <div className="window-dots">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>

                  <span>DBESTHUNT / PRICE WATCH</span>
                </div>

                <div className="visual-product-row">
                  <div className="mini-product-image">S</div>

                  <div>
                    <strong>Tracked product</strong>
                    <span>Price movement detected</span>
                  </div>

                  <b className="mini-drop">PRICE DROP</b>
                </div>

                <div className="visual-price-row">
                  <div>
                    <span>PREVIOUS PRICE</span>
                    <strong>₹60.00</strong>
                  </div>

                  <div className="visual-arrow">↓</div>

                  <div className="new-price">
                    <span>NOW</span>
                    <strong>₹51.77</strong>
                  </div>
                </div>

                <div className="mini-chart">
                  <div className="mini-chart-labels">
                    <span>PRICE HISTORY</span>
                    <span>LAST 30 DAYS</span>
                  </div>

                  <svg viewBox="0 0 520 130" preserveAspectRatio="none">
                    <path
                      d="M0 34 C55 30 74 70 120 57 S188 43 230 65 S292 91 340 70 S410 46 455 55 S492 33 520 22"
                      fill="none"
                      className="mini-chart-line"
                    />

                    <circle
                      cx="520"
                      cy="22"
                      r="7"
                      className="mini-chart-point"
                    />
                  </svg>
                </div>

                <div className="visual-alert">
                  <div className="alert-icon">✓</div>

                  <div>
                    <strong>Email alert sent</strong>
                    <span>Your price dropped from ₹60.00 to ₹51.77.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-section how-section">
            <div className="container">
              <div className="section-intro">
                <div>
                  <span className="eyebrow">HOW IT WORKS</span>
                  <h2>Three steps. One smarter hunt.</h2>
                </div>

                <p>
                  No clutter, no endless checking. Add a product and let
                  DBestHunt keep watch.
                </p>
              </div>

              <div className="how-grid">
                <article className="how-card featured-step">
                  <span className="step-number">01</span>

                  <div className="step-icon">↗</div>

                  <h3>Add a product</h3>

                  <p>
                    Paste a product URL and DBestHunt fetches the product
                    details and current price.
                  </p>

                  <span className="step-caption">START THE HUNT</span>
                </article>

                <article className="how-card">
                  <span className="step-number">02</span>

                  <div className="step-icon">⌁</div>

                  <h3>Watch the price</h3>

                  <p>
                    Keep a clear history of price points so you can see where
                    the product has been.
                  </p>

                  <span className="step-caption">SEE THE MOVEMENT</span>
                </article>

                <article className="how-card">
                  <span className="step-number">03</span>

                  <div className="step-icon">↓</div>

                  <h3>Catch the deal</h3>

                  <p>
                    When the price falls, DBestHunt sends an email alert so you
                    know when it is time to check the deal.
                  </p>

                  <span className="step-caption">GET THE EMAIL ALERT</span>
                </article>
              </div>
            </div>
          </section>

          <section className="landing-section email-section">
            <div className="container email-section-grid">
              <div className="email-copy">
                <span className="eyebrow">EMAIL ALERTS</span>

                <h2>Know when the price drops. Without checking all day.</h2>

                <p>
                  DBestHunt checks tracked products automatically. When a price
                  falls, it sends a price-drop email with the old price, new
                  price, and product link.
                </p>

                <div className="email-benefits">
                  <span>✓ Automatic price checks</span>
                  <span>✓ Price-drop email alerts</span>
                  <span>✓ Direct product link</span>
                </div>
              </div>

              <div className="email-card">
                <div className="email-card-top">
                  <span>DBESTHUNT</span>
                  <span>PRICE DROP ALERT</span>
                </div>

                <div className="email-card-body">
                  <div className="email-badge">↓</div>

                  <div>
                    <span className="email-label">PRICE DROP</span>

                    <h3>A Light in the Attic</h3>

                    <div className="email-prices">
                      <span>£60.00</span>
                      <strong>→ £51.77</strong>
                    </div>

                    <p>
                      The price has dropped. This may be a good time to buy.
                    </p>

                    <button type="button" className="email-view-button">
                      View product ↗
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <div className="footer-brand">
            <div className="brand-icon small">D</div>
            <span>DBestHunt</span>
          </div>

          <p>Hunt the price. Catch the deal.</p>

          <span>Smart Product Price Tracking</span>
        </footer>
      </div>
    );
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

        <div className="header-actions">
          <div className="user-info">
            {user.pictureUrl ? (
              <img
                className="user-avatar"
                src={user.pictureUrl}
                alt={user.name || "User"}
              />
            ) : (
              <div className="user-avatar fallback">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="user-details">
              <strong>{user.name || "User"}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
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
              {products.length} product
              {products.length !== 1 ? "s" : ""}
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
                          onClick={() => openProduct(product)}
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
                  setHistoryLoading(false);
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

  if (!points.length) {
    return (
      <div className="history-loading">No valid price history available.</div>
    );
  }

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

    return {
      ...point,
      x,
      y,
    };
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
            {points.length} price point
            {points.length !== 1 ? "s" : ""}
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
              .map((entry, index) => (
                <tr key={entry.id ?? `${entry.recordedAt}-${index}`}>
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
