package DBestHunt.Backend.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "price_checks")
public class PriceCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "checked_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal checkedPrice;

    @Column(nullable = false, length = 10)
    private String currency;

    @Column(name = "price_changed", nullable = false)
    private boolean priceChanged;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;

    public PriceCheck() {
    }

    public Long getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public BigDecimal getCheckedPrice() {
        return checkedPrice;
    }

    public void setCheckedPrice(BigDecimal checkedPrice) {
        this.checkedPrice = checkedPrice;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public boolean isPriceChanged() {
        return priceChanged;
    }

    public void setPriceChanged(boolean priceChanged) {
        this.priceChanged = priceChanged;
    }

    public LocalDateTime getCheckedAt() {
        return checkedAt;
    }

    public void setCheckedAt(LocalDateTime checkedAt) {
        this.checkedAt = checkedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (checkedAt == null) {
            checkedAt = LocalDateTime.now();
        }
    }
}