package DBestHunt.Backend.controller;

import DBestHunt.Backend.entity.User;
import DBestHunt.Backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal OidcUser oidcUser) {

        if (oidcUser == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository
                .findByGoogleId(oidcUser.getSubject())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).build();
        }

        return ResponseEntity.ok(
                Map.of(
                        "id", user.getId(),
                        "googleId", user.getGoogleId(),
                        "email", user.getEmail(),
                        "name", user.getName() == null ? "" : user.getName(),
                        "pictureUrl", user.getPictureUrl() == null
                                ? ""
                                : user.getPictureUrl()
                )
        );
    }
}
