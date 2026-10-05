package DBestHunt.Backend.repository;

import DBestHunt.Backend.entity.PriceCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PriceCheckRepository extends JpaRepository<PriceCheck, Long> {

    List<PriceCheck> findByProductIdOrderByCheckedAtAsc(Long productId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PriceCheck p WHERE p.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}