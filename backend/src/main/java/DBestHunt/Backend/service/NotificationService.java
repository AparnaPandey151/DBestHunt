package DBestHunt.Backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class NotificationService {

    private final RestClient restClient;
    private final String apiKey;
    private final String fromEmail;
    private final String toEmail;

    public NotificationService(
            @Value("${resend.api-key}") String apiKey,
            @Value("${resend.from-email}") String fromEmail,
            @Value("${resend.to-email}") String toEmail) {

        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
        this.toEmail = toEmail;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .build();
    }

    public void sendPriceDropNotification(
            String productName,
            String productUrl,
            String currency,
            String oldPrice,
            String newPrice) {

        String subject = "Price Drop Alert: " + productName;

        String html = """
                <h2>Price Drop Alert!</h2>
                <p>The price of <strong>%s</strong> has dropped.</p>
                <p><strong>Old Price:</strong> %s %s</p>
                <p><strong>New Price:</strong> %s %s</p>
                <p>
                    <a href="%s">View Product</a>
                </p>
                """.formatted(
                    productName,
                    oldPrice,
                    currency,
                    newPrice,
                    currency,
                    productUrl
                );

        Map<String, Object> requestBody = Map.of(
                "from", fromEmail,
                "to", new String[] { toEmail },
                "subject", subject,
                "html", html);

        restClient.post()
                .uri("/emails")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Object.class);
    }
}