Feature: Pruebas de Aceptación Automatizadas para Core Card Manager API

  Background:
    * url 'http://localhost:8080'
    * header Content-Type = 'application/json'

  Scenario: Registrar un nuevo cliente exitosamente en el Core
    Given path '/api/clients'
    And request { name: 'Luis Restrepo', email: 'luis.restrepo@bancolombia.com.co', documentNumber: '10987654', phone: '3157778899' }
    When method post
    Then status 201
    And match response.name == 'Luis Restrepo'
    And match response.documentNumber == '10987654'
    And match response.id == '#present'

  Scenario: Emitir una tarjeta de débito para el cliente registrado
    Given path '/api/clients'
    And request { name: 'Sofia Mesa', email: 'sofia.mesa@bancolombia.com.co', documentNumber: '20304050', phone: '3128889900' }
    When method post
    Then status 201
    * def clientId = response.id

    Given path '/api/cards'
    And request { clientId: '#(clientId)', cardType: 'DEBIT', creditLimit: 0 }
    When method post
    Then status 201
    And match response.cardType == 'DEBIT'
    And match response.status == 'ACTIVE'
    And match response.balance == 0
    And match response.cardNumber == '#regex ^[0-9]{16}$'

  Scenario: Rechazar transacción por fondos insuficientes en tarjeta débito
    # Buscar una tarjeta existente o emitir una nueva y validar el fallo de pago
    Given path '/api/clients'
    And request { name: 'Carlos Mario', email: 'carlos@bancolombia.com', documentNumber: '99001122', phone: '3201112233' }
    When method post
    Then status 201
    * def clientId = response.id

    # Emitir tarjeta débito (saldo inicial 0)
    Given path '/api/cards'
    And request { clientId: '#(clientId)', cardType: 'DEBIT', creditLimit: 0 }
    When method post
    Then status 201
    * def cardId = response.id

    # Procesar compra de 10000 COP (debe fallar)
    Given path '/api/transactions'
    And request { cardId: '#(cardId)', amount: 10000.0, transactionType: 'PAYMENT', description: 'Compra Almacén Éxito' }
    When method post
    Then status 400
    And match response.message contains 'Fondos insuficientes'
