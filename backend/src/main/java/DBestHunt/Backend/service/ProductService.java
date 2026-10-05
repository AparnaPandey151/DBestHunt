package DBestHunt.Backend.service;

import DBestHunt.Backend.entity.PriceHistory;
import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.repository.PriceCheckRepository;
import DBestHunt.Backend.repository.PriceHistoryRepository;
import DBestHunt.Backend.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final PriceCheckRepository priceCheckRepository;
    private final FirecrawlService firecrawlService;

    public ProductService(
            ProductRepository productRepository,
            PriceHistoryRepository priceHistoryRepository,
            PriceCheckRepository priceCheckRepository,
            FirecrawlService firecrawlService) {

        this.productRepository = productRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.priceCheckRepository = priceCheckRepository;
        this.firecrawlService = firecrawlService;
    }

    public List<Product> getProductsByUser(Long userId) {
        return productRepository.findByUserId(userId);
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    public Optional<Product> getProductByIdAndUser(
            Long productId,
            Long userId) {

        return productRepository.findById(productId)
                .filter(product -> product.getUserId().equals(userId));
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {

        // Delete price checks first
        priceCheckRepository.deleteByProductId(id);

        // Delete price history
        priceHistoryRepository.deleteByProductId(id);

        // Delete the product
        productRepository.deleteById(id);
    }

    @Transactional
    public void deleteProductForUser(
            Long productId,
            Long userId) {

        Product product = getProductByIdAndUser(productId, userId)
                .orElseThrow(() ->
                        new RuntimeException("Product not found"));

        deleteProduct(product.getId());
    }

    @SuppressWarnings("unchecked")
    public Product importProduct(
            String productUrl,
            Long userId) {

        Map<String, Object> response =
                (Map<String, Object>)
                        firecrawlService.scrapeProduct(productUrl);

        Map<String, Object> data =
                (Map<String, Object>) response.get("data");

        Map<String, Object> json =
                (Map<String, Object>) data.get("json");

        Product product = new Product();

        product.setUrl(
                (String) json.get("url"));

        product.setName(
                (String) json.get("name"));

        product.setCurrentPrice(
                new BigDecimal(
                        json.get("price").toString()));

        product.setCurrency(
                (String) json.get("currency"));

        product.setImageUrl(
                (String) json.get("main_image_url"));

        product.setUserId(userId);

        Product savedProduct =
                productRepository.save(product);

        /*
         * The initial price is part of the price history.
         */
        savePriceHistory(
                savedProduct,
                savedProduct.getCurrentPrice(),
                savedProduct.getCurrency());

        return savedProduct;
    }

    public PriceHistory savePriceHistory(
            Product product,
            BigDecimal price,
            String currency) {

        /*
         * Do not create another history entry
         * if the latest recorded price is the same.
         */
        List<PriceHistory> history =
                priceHistoryRepository
                        .findByProductIdOrderByRecordedAtAsc(
                                product.getId());

        if (!history.isEmpty()) {

            PriceHistory latest =
                    history.get(history.size() - 1);

            if (latest.getPrice().compareTo(price) == 0) {
                return latest;
            }
        }

        PriceHistory newHistory = new PriceHistory();

        newHistory.setProduct(product);
        newHistory.setPrice(price);
        newHistory.setCurrency(currency);

        return priceHistoryRepository.save(newHistory);
    }

    public List<PriceHistory> getPriceHistory(
            Long productId) {

        return priceHistoryRepository
                .findByProductIdOrderByRecordedAtAsc(
                        productId);
    }
}