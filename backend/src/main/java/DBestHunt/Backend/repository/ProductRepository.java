package DBestHunt.Backend.repository;

import DBestHunt.Backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByUserId(Long userId);

    Optional<Product> findByUrlAndUserId(String url, Long userId);

    boolean existsByUrlAndUserId(String url, Long userId);
}