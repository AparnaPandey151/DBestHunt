package DBestHunt.Backend.controller;

import DBestHunt.Backend.entity.PriceHistory;
import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.service.PriceCheckService;
import DBestHunt.Backend.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final PriceCheckService priceCheckService;

    public ProductController(
            ProductService productService,
            PriceCheckService priceCheckService) {

        this.productService = productService;
        this.priceCheckService = priceCheckService;
    }

    @GetMapping("/user/{userId}")
    public List<Product> getProductsByUser(
            @PathVariable Long userId) {

        return productService.getProductsByUser(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(
            @PathVariable Long id) {

        return productService.getProductById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Product createProduct(
            @RequestBody Product product) {

        return productService.saveProduct(product);
    }

    @PostMapping("/import")
    public Product importProduct(
            @RequestParam String url,
            @RequestParam Long userId) {

        return productService.importProduct(url, userId);
    }

    @GetMapping("/{productId}/price-history")
    public List<PriceHistory> getPriceHistory(
            @PathVariable Long productId) {

        return productService.getPriceHistory(productId);
    }

    @PostMapping("/{productId}/check-price")
    public ResponseEntity<Product> checkPrice(
            @PathVariable Long productId) {

        return productService.getProductById(productId)
                .map(product -> ResponseEntity.ok(
                        priceCheckService.checkProductPrice(product)
                ))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id) {

        if (productService.getProductById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        productService.deleteProduct(id);

        return ResponseEntity.noContent().build();
    }
}