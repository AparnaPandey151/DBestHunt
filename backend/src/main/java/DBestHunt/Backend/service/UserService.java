package DBestHunt.Backend.service;

import DBestHunt.Backend.entity.User;
import DBestHunt.Backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findOrCreateGoogleUser(
            String googleId,
            String email,
            String name,
            String pictureUrl) {

        User user = userRepository
                .findByGoogleId(googleId)
                .orElseGet(User::new);

        user.setGoogleId(googleId);
        user.setEmail(email);
        user.setName(name);
        user.setPictureUrl(pictureUrl);

        return userRepository.save(user);
    }

    public User findByGoogleId(String googleId) {

        return userRepository
                .findByGoogleId(googleId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }
}