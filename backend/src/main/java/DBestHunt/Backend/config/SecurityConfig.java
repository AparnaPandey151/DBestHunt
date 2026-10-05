package DBestHunt.Backend.config;

import DBestHunt.Backend.entity.User;
import DBestHunt.Backend.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private final UserService userService;

    public SecurityConfig(UserService userService) {
        this.userService = userService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(Customizer.withDefaults())

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                HttpMethod.OPTIONS,
                                "/**"
                        )
                        .permitAll()

                        .requestMatchers(
                                "/",
                                "/error",
                                "/oauth2/**",
                                "/login/**"
                        )
                        .permitAll()

                        .requestMatchers(
                                "/api/auth/me"
                        )
                        .authenticated()

                        .requestMatchers(
                                "/api/products/**",
                                "/api/firecrawl/**"
                        )
                        .authenticated()

                        .anyRequest()
                        .permitAll()
                )

                .oauth2Login(oauth2 -> oauth2

                        .userInfoEndpoint(userInfo ->
                                userInfo.oidcUserService(
                                        this::oidcUserService
                                )
                        )

                        .successHandler(
                                (request, response, authentication) -> {
                                    response.sendRedirect(
                                            "http://localhost:5173"
                                    );
                                }
                        )
                )

                .logout(logout -> logout

                        .logoutSuccessHandler(
                                (request, response, authentication) -> {
                                    response.sendRedirect(
                                            "http://localhost:5173"
                                    );
                                }
                        )
                );

        return http.build();
    }

    private OidcUser oidcUserService(
            OidcUserRequest userRequest) {

        OidcUserService delegate =
                new OidcUserService();

        OidcUser oidcUser =
                delegate.loadUser(userRequest);

        String googleId =
                oidcUser.getSubject();

        String email =
                oidcUser.getEmail();

        String name =
                oidcUser.getFullName();

        String pictureUrl =
                oidcUser.getPicture();

        User user =
                userService.findOrCreateGoogleUser(
                        googleId,
                        email,
                        name,
                        pictureUrl
                );

        return oidcUser;
    }
}