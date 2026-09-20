package DBestHunt.Backend.service;

import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.repository.ProductRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class PriceCheckService {

    private final ProductRepository productRepository;
    private final ProductService productService;
    private final FirecrawlService firecrawlService;

    public PriceCheckService(
            ProductRepository productRepository,
            ProductService productService,
            FirecrawlService firecrawlService) {

        this.productRepository = productRepository;
        this.productService = productService;
        this.firecrawlService = firecrawlService;
    }

    @SuppressWarnings("unchecked")
    public Product checkProductPrice(Product product) {

        BigDecimal oldPrice = product.getCurrentPrice();

        Map<String, Object> response =
                (Map<String, Object>) firecrawlService
                        .scrapeProduct(product.getUrl());

        Map<String, Object> data =
                (Map<String, Object>) response.get("data");

        Map<String, Object> json =
                (Map<String, Object>) data.get("json");

        BigDecimal newPrice =
                new BigDecimal(json.get("price").toString());

        String currency = (String) json.get("currency");

        boolean priceDropped = newPrice.compareTo(oldPrice) < 0;

        if (priceDropped) {
            System.out.println(
                    "PRICE DROP: " +
                    product.getName() +
                    " | " +
                    oldPrice +
                    " -> " +
                    newPrice
            );
        }

        productService.savePriceHistory(
                product,
                newPrice,
                currency
        );

        product.setCurrentPrice(newPrice);
        product.setCurrency(currency);

        return productRepository.save(product);
    }

    public void checkAllProducts() {

        List<Product> products = productRepository.findAll();

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

    @Scheduled(fixedRate = 21600000)
    public void scheduledPriceCheck() {
        checkAllProducts();
    }
}
