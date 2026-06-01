package com.bancolombia.cardmanager.controller;

import com.bancolombia.cardmanager.model.Card;
import com.bancolombia.cardmanager.model.CardStatus;
import com.bancolombia.cardmanager.model.CardType;
import com.bancolombia.cardmanager.model.Transaction;
import com.bancolombia.cardmanager.service.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/cards")
@CrossOrigin(origins = "*")
public class CardController {

    private final CardService cardService;

    @Autowired
    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @PostMapping
    public ResponseEntity<Card> createCard(@RequestBody CardRequest request) {
        Card created = cardService.createCard(request.getClientId(), request.getCardType(), request.getCreditLimit());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Card>> getAllCards() {
        return ResponseEntity.ok(cardService.getAllCards());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Card> getCardById(@PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCardById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Card> updateCardStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest request) {
        Card updated = cardService.updateCardStatus(id, request.getStatus());
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<List<Transaction>> getCardTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(cardService.getTransactionsByCardId(id));
    }

    // Static DTOs for REST requests
    public static class CardRequest {
        private Long clientId;
        private CardType cardType;
        private BigDecimal creditLimit;

        public Long getClientId() { return clientId; }
        public void setClientId(Long clientId) { this.clientId = clientId; }

        public CardType getCardType() { return cardType; }
        public void setCardType(CardType cardType) { this.cardType = cardType; }

        public BigDecimal getCreditLimit() { return creditLimit; }
        public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
    }

    public static class StatusUpdateRequest {
        private CardStatus status;

        public CardStatus getStatus() { return status; }
        public void setStatus(CardStatus status) { this.status = status; }
    }
}
