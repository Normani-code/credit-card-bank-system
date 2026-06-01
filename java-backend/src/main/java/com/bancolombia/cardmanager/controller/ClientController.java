package com.bancolombia.cardmanager.controller;

import com.bancolombia.cardmanager.model.Client;
import com.bancolombia.cardmanager.model.Card;
import com.bancolombia.cardmanager.service.CardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*")
public class ClientController {

    private final CardService cardService;

    @Autowired
    public ClientController(CardService cardService) {
        this.cardService = cardService;
    }

    @PostMapping
    public ResponseEntity<Client> createClient(@RequestBody Client client) {
        Client created = cardService.createClient(client);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Client>> getAllClients() {
        return ResponseEntity.ok(cardService.getAllClients());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable Long id) {
        return ResponseEntity.ok(cardService.getClientById(id));
    }

    @GetMapping("/{id}/cards")
    public ResponseEntity<List<Card>> getCardsByClient(@PathVariable Long id) {
        return ResponseEntity.ok(cardService.getCardsByClientId(id));
    }
}
