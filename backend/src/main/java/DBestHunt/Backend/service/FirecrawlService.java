package DBestHunt.Backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class FirecrawlService {

    private final RestClient restClient;
    private final String apiKey;

    public FirecrawlService(@Value("${firecrawl.api-key}") String apiKey) {
        this.apiKey = apiKey;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.firecrawl.dev/v2")
                .build();
    }

    public Object scrapeProduct(String productUrl) {

        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "url", Map.of(
                                "type", "string",
                                "description", "The URL of the product"
                        ),
                        "name", Map.of(
                                "type", "string",
                                "description", "The product name or title"
                        ),
                        "price", Map.of(
                                "type", "number",
                                "description", "The current price of the product"
                        ),
                        "currency", Map.of(
                                "type", "string",
                                "description", "The currency code such as USD, INR or EUR"
                        ),
                        "main_image_url", Map.of(
                                "type", "string",
                                "description", "The URL of the main product image"
                        )
                ),
                "required", new String[]{
                        "url",
                        "name",
                        "price",
                        "currency",
                        "main_image_url"
                }
        );

        Map<String, Object> jsonFormat = Map.of(
                "type", "json",
                "prompt", "Extract the product name, current price, currency, product URL, and main product image URL from this product page.",
                "schema", schema
        );

        Map<String, Object> requestBody = Map.of(
                "url", productUrl,
                "formats", new Object[]{jsonFormat}
        );

        return restClient.post()
                .uri("/scrape")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Object.class);
    }
}