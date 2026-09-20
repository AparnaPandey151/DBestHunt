package DBestHunt.Backend.service;

import DBestHunt.Backend.entity.PriceHistory;
import DBestHunt.Backend.entity.Product;
import DBestHunt.Backend.repository.PriceHistoryRepository;
import DBestHunt.Backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final PriceHistoryRepository priceHistoryRepository;
    private final FirecrawlService firecrawlService;

    public ProductService(
            ProductRepository productRepository,
            PriceHistoryRepository priceHistoryRepository,
            FirecrawlService firecrawlService) {

        this.productRepository = productRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.firecrawlService = firecrawlService;
    }

    public List<Product> getProductsByUser(Long userId) {
        return productRepository.findByUserId(userId);
    }

    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    public Product saveProduct(Product product) {
        return productRepository.save(product);
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    @SuppressWarnings("unchecked")
    public Product importProduct(String productUrl, Long userId) {

        Map<String, Object> response =
                (Map<String, Object>) firecrawlService.scrapeProduct(productUrl);

        Map<String, Object> data =
                (Map<String, Object>) response.get("data");

        Map<String, Object> json =
                (Map<String, Object>) data.get("json");

        Product product = new Product();

        product.setUrl((String) json.get("url"));
        product.setName((String) json.get("name"));
        product.setCurrentPrice(
                new BigDecimal(json.get("price").toString())
        );
        product.setCurrency((String) json.get("currency"));
        product.setImageUrl((String) json.get("main_image_url"));
        product.setUserId(userId);

        return productRepository.save(product);
    }

    public PriceHistory savePriceHistory(
            Product product,
            BigDecimal price,
            String currency) {

        PriceHistory history = new PriceHistory();
        history.setProduct(product);
        history.setPrice(price);
        history.setCurrency(currency);

        return priceHistoryRepository.save(history);
    }

    public List<PriceHistory> getPriceHistory(Long productId) {
        return priceHistoryRepository
                .findByProductIdOrderByRecordedAtAsc(productId);
    }
}