package DBestHunt.Backend.controller;

import DBestHunt.Backend.service.FirecrawlService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/firecrawl")
public class FirecrawlController {

    private final FirecrawlService firecrawlService;

    public FirecrawlController(FirecrawlService firecrawlService) {
        this.firecrawlService = firecrawlService;
    }

    @PostMapping("/scrape")
    public Object scrapeProduct(@RequestParam String url) {
        return firecrawlService.scrapeProduct(url);
    }
}