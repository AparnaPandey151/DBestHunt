package DBestHunt.Backend.controller;

import DBestHunt.Backend.entity.PriceHistory;
import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.entity.User;
import DBestHunt.Backend.service.PriceCheckService;
import DBestHunt.Backend.service.ProductService;
import DBestHunt.Backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final PriceCheckService priceCheckService;
    private final UserService userService;

    public ProductController(
            ProductService productService,
            PriceCheckService priceCheckService,
            UserService userService) {

        this.productService = productService;
        this.priceCheckService = priceCheckService;
        this.userService = userService;
    }

    /*
     * Get all products belonging to the currently logged-in user.
     */
    @GetMapping
    public ResponseEntity<List<Product>> getMyProducts(
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        return ResponseEntity.ok(
                productService.getProductsByUser(user.getId())
        );
    }

    /*
     * Import a product using Firecrawl.
     *
     * The user ID is taken from the authenticated Google session.
     * The frontend no longer needs to send userId.
     */
    @PostMapping("/import")
    public ResponseEntity<Product> importProduct(
            @RequestParam String url,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        Product product =
                productService.importProduct(
                        url,
                        user.getId()
                );

        return ResponseEntity.ok(product);
    }

    /*
     * Get one product only if it belongs to the logged-in user.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProductById(
            @PathVariable Long id,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        return productService
                .getProductByIdAndUser(id, user.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /*
     * Create a product for the logged-in user.
     *
     * This endpoint is kept for the existing backend functionality,
     * but the user ID is always taken from the authenticated session.
     */
    @PostMapping
    public ResponseEntity<Product> createProduct(
            @RequestBody Product product,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        product.setUserId(user.getId());

        return ResponseEntity.ok(
                productService.saveProduct(product)
        );
    }

    /*
     * Get price history only for a product belonging to
     * the logged-in user.
     */
    @GetMapping("/{productId}/price-history")
    public ResponseEntity<List<PriceHistory>> getPriceHistory(
            @PathVariable Long productId,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        if (productService
                .getProductByIdAndUser(productId, user.getId())
                .isEmpty()) {

            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                productService.getPriceHistory(productId)
        );
    }

    /*
     * Check the current price only for a product belonging
     * to the logged-in user.
     */
    @PostMapping("/{productId}/check-price")
    public ResponseEntity<Product> checkPrice(
            @PathVariable Long productId,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        return productService
                .getProductByIdAndUser(productId, user.getId())
                .map(product ->
                        ResponseEntity.ok(
                                priceCheckService
                                        .checkProductPrice(product)
                        )
                )
                .orElse(ResponseEntity.notFound().build());
    }

    /*
     * Delete only the logged-in user's own product.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal OidcUser oidcUser) {

        User user = getAuthenticatedUser(oidcUser);

        if (productService
                .getProductByIdAndUser(id, user.getId())
                .isEmpty()) {

            return ResponseEntity.notFound().build();
        }

        productService.deleteProductForUser(
                id,
                user.getId()
        );

        return ResponseEntity.noContent().build();
    }

    /*
     * Converts the authenticated Google account into
     * our DBestHunt User.
     */
    private User getAuthenticatedUser(
            OidcUser oidcUser) {

        if (oidcUser == null) {
            throw new RuntimeException(
                    "User is not authenticated"
            );
        }

        return userService.findByGoogleId(
                oidcUser.getSubject()
        );
    }
}