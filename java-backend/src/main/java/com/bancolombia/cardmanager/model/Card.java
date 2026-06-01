package com.bancolombia.cardmanager.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "cards")
public class Card {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.EAGER)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    @Column(nullable = false, unique = true, name = "card_number")
    private String cardNumber;

    @Column(nullable = false, name = "card_holder")
    private String cardHolder;

    @Column(nullable = false, name = "expiration_date")
    private String expirationDate;

    @Column(nullable = false, name = "cvv")
    private String cvv;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "card_type")
    private CardType cardType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "status")
    private CardStatus status;

    @Column(nullable = false, name = "balance")
    private BigDecimal balance;

    @Column(nullable = false, name = "credit_limit")
    private BigDecimal creditLimit;

    public Card() {}

    public Card(Client client, String cardNumber, String cardHolder, String expirationDate, String cvv, CardType cardType, CardStatus status, BigDecimal balance, BigDecimal creditLimit) {
        this.client = client;
        this.cardNumber = cardNumber;
        this.cardHolder = cardHolder;
        this.expirationDate = expirationDate;
        this.cvv = cvv;
        this.cardType = cardType;
        this.status = status;
        this.balance = balance;
        this.creditLimit = creditLimit;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }

    public String getCardHolder() { return cardHolder; }
    public void setCardHolder(String cardHolder) { this.cardHolder = cardHolder; }

    public String getExpirationDate() { return expirationDate; }
    public void setExpirationDate(String expirationDate) { this.expirationDate = expirationDate; }

    public String getCvv() { return cvv; }
    public void setCvv(String cvv) { this.cvv = cvv; }

    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }

    public CardStatus getStatus() { return status; }
    public void setStatus(CardStatus status) { this.status = status; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public BigDecimal getCreditLimit() { return creditLimit; }
    public void setCreditLimit(BigDecimal creditLimit) { this.creditLimit = creditLimit; }
}
