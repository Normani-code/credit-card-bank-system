package com.bancolombia.cardmanager;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
public class CardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testClientsEndpointFlow() throws Exception {
        // 1. Get all clients (empty list at start)
        mockMvc.perform(get("/api/clients")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // 2. Create a new client
        String clientJson = "{\"name\":\"Ana Gomez\",\"email\":\"ana.gomez@bancolombia.com\",\"documentNumber\":\"987654321\",\"phone\":\"3009876543\"}";
        
        mockMvc.perform(post("/api/clients")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clientJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Ana Gomez"))
                .andExpect(jsonPath("$.documentNumber").value("987654321"));
    }
}
