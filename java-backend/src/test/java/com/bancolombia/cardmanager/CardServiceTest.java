package com.bancolombia.cardmanager;

import com.bancolombia.cardmanager.exception.*;
import com.bancolombia.cardmanager.model.*;
import com.bancolombia.cardmanager.repository.*;
import com.bancolombia.cardmanager.service.CardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CardServiceTest {

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private CardRepository cardRepository;
    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private CardService cardService;

    private Client client;
    private Card debitCard;
    private Card creditCard;

    @BeforeEach
    void setUp() {
        client = new Client("Pepito Perez", "pepito@bancolombia.com", "123456789", "3001234567");
        client.setId(1L);
        
        debitCard = new Card(client, "4000123456789012", "PEPITO PEREZ", "12/30", "123", 
                CardType.DEBIT, CardStatus.ACTIVE, BigDecimal.valueOf(100.0), BigDecimal.ZERO);
        debitCard.setId(10L);

        creditCard = new Card(client, "5412123456789012", "PEPITO PEREZ", "12/30", "456", 
                CardType.CREDIT, CardStatus.ACTIVE, BigDecimal.ZERO, BigDecimal.valueOf(500.0));
        creditCard.setId(20L);
    }

    @Test
    void testCreateClient_Success() {
        when(clientRepository.findByDocumentNumber(client.getDocumentNumber())).thenReturn(Optional.empty());
        when(clientRepository.findByEmail(client.getEmail())).thenReturn(Optional.empty());
        when(clientRepository.save(any(Client.class))).thenReturn(client);

        Client result = cardService.createClient(client);
        assertNotNull(result);
        assertEquals(client.getName(), result.getName());
    }

    @Test
    void testCreateClient_DuplicateDocument_ThrowsException() {
        when(clientRepository.findByDocumentNumber(client.getDocumentNumber())).thenReturn(Optional.of(client));

        assertThrows(IllegalArgumentException.class, () -> cardService.createClient(client));
    }

    @Test
    void testProcessDebitPayment_Success() {
        when(cardRepository.findById(10L)).thenReturn(Optional.of(debitCard));
        when(cardRepository.save(any(Card.class))).thenReturn(debitCard);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction tx = cardService.processTransaction(10L, BigDecimal.valueOf(40.0), TransactionType.PAYMENT, "Compra Tienda");
        
        assertNotNull(tx);
        assertEquals(TransactionStatus.APPROVED, tx.getStatus());
        assertEquals(BigDecimal.valueOf(60.0), debitCard.getBalance());
    }

    @Test
    void testProcessDebitPayment_InsufficientFunds_ThrowsException() {
        when(cardRepository.findById(10L)).thenReturn(Optional.of(debitCard));

        assertThrows(InsufficientFundsException.class, () -> 
            cardService.processTransaction(10L, BigDecimal.valueOf(150.0), TransactionType.PAYMENT, "Compra Costosa")
        );
    }

    @Test
    void testProcessCreditPayment_Success() {
        when(cardRepository.findById(20L)).thenReturn(Optional.of(creditCard));
        when(cardRepository.save(any(Card.class))).thenReturn(creditCard);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Credit balance increases with spending (utilization)
        Transaction tx = cardService.processTransaction(20L, BigDecimal.valueOf(200.0), TransactionType.PAYMENT, "Compra Electrodomesticos");

        assertNotNull(tx);
        assertEquals(TransactionStatus.APPROVED, tx.getStatus());
        assertEquals(BigDecimal.valueOf(200.0), creditCard.getBalance()); // utilized
    }

    @Test
    void testProcessTransaction_BlockedCard_ThrowsException() {
        debitCard.setStatus(CardStatus.BLOCKED);
        when(cardRepository.findById(10L)).thenReturn(Optional.of(debitCard));

        assertThrows(CardBlockedException.class, () -> 
            cardService.processTransaction(10L, BigDecimal.valueOf(10.0), TransactionType.PAYMENT, "Compra Tarjeta Bloqueada")
        );
    }
}
