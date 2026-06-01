package com.bancolombia.cardmanager.repository;

import com.bancolombia.cardmanager.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByCardIdOrderByTimestampDesc(Long cardId);
    List<Transaction> findTop10ByOrderByTimestampDesc();
}
