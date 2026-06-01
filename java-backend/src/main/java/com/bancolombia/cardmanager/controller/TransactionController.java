package com.bancolombia.cardmanager.controller;

import com.bancolombia.cardmanager.model.Transaction;
import com.bancolombia.cardmanager.model.TransactionType;
import com.bancolombia.cardmanager.service.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    private final CardService cardService;

    @Autowired
    public TransactionController(CardService cardService) {
        this.cardService = cardService;
    }

    @PostMapping
    public ResponseEntity<Transaction> createTransaction(@RequestBody TransactionRequest request) {
        Transaction created = cardService.processTransaction(
                request.getCardId(),
                request.getAmount(),
                request.getTransactionType(),
                request.getDescription()
        );
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transferMoney(@RequestBody TransferRequest request) {
        cardService.transferMoney(
                request.getSourceCardId(),
                request.getDestinationCardId(),
                request.getAmount(),
                request.getDescription()
        );
        Map<String, String> response = new HashMap<>();
        response.put("message", "Transferencia procesada exitosamente entre tarjetas");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<Transaction>> getRecentTransactions() {
        return ResponseEntity.ok(cardService.getRecentTransactions());
    }

    // Static DTO for REST request
    public static class TransactionRequest {
        private Long cardId;
        private BigDecimal amount;
        private TransactionType transactionType;
        private String description;

        public Long getCardId() { return cardId; }
        public void setCardId(Long cardId) { this.cardId = cardId; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public TransactionType getTransactionType() { return transactionType; }
        public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    public static class TransferRequest {
        private Long sourceCardId;
        private Long destinationCardId;
        private BigDecimal amount;
        private String description;

        public Long getSourceCardId() { return sourceCardId; }
        public void setSourceCardId(Long sourceCardId) { this.sourceCardId = sourceCardId; }

        public Long getDestinationCardId() { return destinationCardId; }
        public void setDestinationCardId(Long destinationCardId) { this.destinationCardId = destinationCardId; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }
}
