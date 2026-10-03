package DBestHunt.Backend.repository;

import DBestHunt.Backend.entity.PriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PriceHistoryRepository extends JpaRepository<PriceHistory, Long> {

    List<PriceHistory> findByProductIdOrderByRecordedAtAsc(Long productId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PriceHistory p WHERE p.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}