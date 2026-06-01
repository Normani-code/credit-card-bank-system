package com.bancolombia.cardmanager.service;

import com.bancolombia.cardmanager.exception.*;
import com.bancolombia.cardmanager.model.*;
import com.bancolombia.cardmanager.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class CardService {

    private final ClientRepository clientRepository;
    private final CardRepository cardRepository;
    private final TransactionRepository transactionRepository;
    private final Random random = new Random();

    @Autowired
    public CardService(ClientRepository clientRepository, CardRepository cardRepository, TransactionRepository transactionRepository) {
        this.clientRepository = clientRepository;
        this.cardRepository = cardRepository;
        this.transactionRepository = transactionRepository;
    }

    // --- Client Operations ---

    @Transactional
    public Client createClient(Client client) {
        if (clientRepository.findByDocumentNumber(client.getDocumentNumber()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un cliente registrado con el documento: " + client.getDocumentNumber());
        }
        if (clientRepository.findByEmail(client.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un cliente registrado con el correo: " + client.getEmail());
        }
        return clientRepository.save(client);
    }

    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    public Client getClientById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + id));
    }

    // --- Card Operations ---

    @Transactional
    public Card createCard(Long clientId, CardType cardType, BigDecimal creditLimit) {
        Client client = getClientById(clientId);
        
        String cardNumber = generateUniqueCardNumber(cardType);
        String cardHolder = client.getName().toUpperCase();
        
        // Expiration 5 years from now: MM/YY
        LocalDateTime now = LocalDateTime.now();
        String expirationDate = String.format("%02d/%02d", now.getMonthValue(), (now.getYear() + 5) % 100);
        
        // 3-digit CVV
        String cvv = String.format("%03d", random.nextInt(1000));
        
        BigDecimal initialBalance = BigDecimal.ZERO;
        BigDecimal limit = (cardType == CardType.CREDIT) ? creditLimit : BigDecimal.ZERO;

        Card card = new Card(client, cardNumber, cardHolder, expirationDate, cvv, cardType, CardStatus.ACTIVE, initialBalance, limit);
        return cardRepository.save(card);
    }

    public List<Card> getAllCards() {
        return cardRepository.findAll();
    }

    public Card getCardById(Long id) {
        return cardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tarjeta no encontrada con ID: " + id));
    }

    public List<Card> getCardsByClientId(Long clientId) {
        return cardRepository.findByClientId(clientId);
    }

    @Transactional
    public Card updateCardStatus(Long cardId, CardStatus status) {
        Card card = getCardById(cardId);
        card.setStatus(status);
        return cardRepository.save(card);
    }

    // --- Transaction Operations ---

    @Transactional
    public Transaction processTransaction(Long cardId, BigDecimal amount, TransactionType type, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de la transacción debe ser mayor a cero.");
        }

        Card card = getCardById(cardId);
        LocalDateTime timestamp = LocalDateTime.now();

        // 1. Check if card is active
        if (card.getStatus() == CardStatus.BLOCKED) {
            Transaction declinedTx = new Transaction(card, amount, type, description + " (Rechazada: Tarjeta Bloqueada)", timestamp, TransactionStatus.DECLINED);
            transactionRepository.save(declinedTx);
            throw new CardBlockedException("Transacción rechazada: La tarjeta número " + card.getCardNumber() + " se encuentra bloqueada.");
        }

        // 2. Validate Funds/Limit
        if (type == TransactionType.PAYMENT || type == TransactionType.WITHDRAWAL) {
            if (card.getCardType() == CardType.DEBIT) {
                // Debit cards: must have sufficient balance
                if (card.getBalance().compareTo(amount) < 0) {
                    Transaction declinedTx = new Transaction(card, amount, type, description + " (Rechazada: Fondos Insuficientes)", timestamp, TransactionStatus.DECLINED);
                    transactionRepository.save(declinedTx);
                    throw new InsufficientFundsException("Transacción rechazada: Fondos insuficientes en tarjeta de débito.");
                }
                // Deduct balance
                card.setBalance(card.getBalance().subtract(amount));
            } else {
                // Credit cards: balance represents utilized credit. Utilized + amount <= creditLimit.
                BigDecimal currentUtilization = card.getBalance();
                BigDecimal availableCredit = card.getCreditLimit().subtract(currentUtilization);
                if (availableCredit.compareTo(amount) < 0) {
                    Transaction declinedTx = new Transaction(card, amount, type, description + " (Rechazada: Cupo Insuficiente)", timestamp, TransactionStatus.DECLINED);
                    transactionRepository.save(declinedTx);
                    throw new InsufficientFundsException("Transacción rechazada: Cupo disponible insuficiente en tarjeta de crédito.");
                }
                // In credit cards, transactions increase utilized balance (deuda)
                card.setBalance(card.getBalance().add(amount));
            }
        } else if (type == TransactionType.DEPOSIT) {
            if (card.getCardType() == CardType.DEBIT) {
                // Deposit to Debit: increase balance
                card.setBalance(card.getBalance().add(amount));
            } else {
                // Payment to Credit (Abono): decrease utilized balance (payment of debt)
                card.setBalance(card.getBalance().subtract(amount));
            }
        }

        // Save card state and approved transaction
        cardRepository.save(card);
        Transaction approvedTx = new Transaction(card, amount, type, description, timestamp, TransactionStatus.APPROVED);
        return transactionRepository.save(approvedTx);
    }

    public List<Transaction> getTransactionsByCardId(Long cardId) {
        // Verify card exists
        getCardById(cardId);
        return transactionRepository.findByCardIdOrderByTimestampDesc(cardId);
    }

    public List<Transaction> getRecentTransactions() {
        return transactionRepository.findTop10ByOrderByTimestampDesc();
    }

    @Transactional
    public void transferMoney(Long sourceCardId, Long destinationCardId, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto de transferencia debe ser mayor a cero.");
        }
        if (sourceCardId.equals(destinationCardId)) {
            throw new IllegalArgumentException("No se puede transferir dinero a la misma tarjeta.");
        }
        
        Card source = getCardById(sourceCardId);
        Card dest = getCardById(destinationCardId);

        // Debit the source card
        processTransaction(sourceCardId, amount, TransactionType.PAYMENT, "Transferencia enviada a " + dest.getCardHolder() + " - " + description);
        
        // Credit the destination card
        processTransaction(destinationCardId, amount, TransactionType.DEPOSIT, "Transferencia recibida de " + source.getCardHolder() + " - " + description);
    }

    // --- Helper Methods ---

    private String generateUniqueCardNumber(CardType cardType) {
        String prefix = (cardType == CardType.CREDIT) ? "5412" : "4000"; // 5412 MasterCard, 4000 Visa
        String number;
        do {
            StringBuilder sb = new StringBuilder(prefix);
            for (int i = 0; i < 12; i++) {
                sb.append(random.nextInt(10));
            }
            number = sb.toString();
        } while (cardRepository.findByCardNumber(number).isPresent());
        
        return number;
    }
}
