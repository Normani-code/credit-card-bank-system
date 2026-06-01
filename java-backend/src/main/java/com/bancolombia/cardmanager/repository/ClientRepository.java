package com.bancolombia.cardmanager.repository;

import com.bancolombia.cardmanager.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByDocumentNumber(String documentNumber);
    Optional<Client> findByEmail(String email);
}
