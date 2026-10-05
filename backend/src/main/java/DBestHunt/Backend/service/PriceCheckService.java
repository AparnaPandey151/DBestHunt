package DBestHunt.Backend.service;

import DBestHunt.Backend.entity.PriceCheck;
import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.entity.User;
import DBestHunt.Backend.repository.PriceCheckRepository;
import DBestHunt.Backend.repository.ProductRepository;
import DBestHunt.Backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class PriceCheckService {

    private final ProductRepository productRepository;
    private final PriceCheckRepository priceCheckRepository;
    private final UserRepository userRepository;
    private final ProductService productService;
    private final FirecrawlService firecrawlService;
    private final NotificationService notificationService;

    public PriceCheckService(
            ProductRepository productRepository,
            PriceCheckRepository priceCheckRepository,
            UserRepository userRepository,
            ProductService productService,
            FirecrawlService firecrawlService,
            NotificationService notificationService) {

        this.productRepository = productRepository;
        this.priceCheckRepository = priceCheckRepository;
        this.userRepository = userRepository;
        this.productService = productService;
        this.firecrawlService = firecrawlService;
        this.notificationService = notificationService;
    }

    @SuppressWarnings("unchecked")
    public Product checkProductPrice(Product product) {

        // Price stored in our database before this check
        BigDecimal oldPrice = product.getCurrentPrice();

        // Get the latest price from the product website
        Map<String, Object> response =
                (Map<String, Object>) firecrawlService
                        .scrapeProduct(product.getUrl());

        Map<String, Object> data =
                (Map<String, Object>) response.get("data");

        Map<String, Object> json =
                (Map<String, Object>) data.get("json");

        BigDecimal newPrice =
                new BigDecimal(json.get("price").toString());

        String currency =
                (String) json.get("currency");

        // Compare old and new prices
        int comparison =
                newPrice.compareTo(oldPrice);

        boolean priceChanged = comparison != 0;

        /*
         * Every successful price check gets a price_checks record.
         *
         * This is different from price_history:
         * price_checks = every check
         * price_history = only actual price changes
         */
        PriceCheck priceCheck = new PriceCheck();

        priceCheck.setProduct(product);
        priceCheck.setCheckedPrice(newPrice);
        priceCheck.setCurrency(currency);
        priceCheck.setPriceChanged(priceChanged);
        priceCheck.setCheckedAt(LocalDateTime.now());

        priceCheckRepository.save(priceCheck);

        /*
         * Only create a price-history record when
         * the price is actually different.
         */
        if (priceChanged) {

            productService.savePriceHistory(
                    product,
                    newPrice,
                    currency
            );
        }

        /*
         * Update the product's current/latest price.
         */
        product.setCurrentPrice(newPrice);
        product.setCurrency(currency);

        /*
         * Save the updated product BEFORE sending
         * the notification.
         */
        Product updatedProduct =
                productRepository.save(product);

        /*
         * Send notification only when the price dropped.
         */
        if (comparison < 0) {

            User user = userRepository
                    .findById(product.getUserId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Product owner not found"
                            )
                    );

            System.out.println(
                    "PRICE DROP: " +
                    product.getName() +
                    " | " +
                    oldPrice +
                    " -> " +
                    newPrice
            );

            /*
             * Email failure should not make the
             * price-check operation fail.
             */
            try {

                notificationService.sendPriceDropNotification(
                        user.getEmail(),
                        product.getName(),
                        product.getUrl(),
                        currency,
                        oldPrice.toString(),
                        newPrice.toString()
                );

            } catch (Exception e) {

                System.err.println(
                        "Price-drop email could not be sent: " +
                        e.getMessage()
                );
            }
        }

        return updatedProduct;
    }

    /*
     * Check every tracked product.
     */
    public void checkAllProducts() {

        List<Product> products =
                productRepository.findAll();

        for (Product product : products) {

            try {

                checkProductPrice(product);

            } catch (Exception e) {

                System.err.println(
                        "Failed to check product " +
                        product.getId() +
                        ": " +
                        e.getMessage()
                );
            }
        }
    }

    /*
     * Automatically check all products every 6 hours.
     */
    @Scheduled(fixedRate = 21600000)
    public void scheduledPriceCheck() {

        checkAllProducts();
    }
}