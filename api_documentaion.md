# Documentazione API - Trattative e Clienti

## Autenticazione
Tutte le chiamate richiedono il token di autenticazione (Bearer Token).
**Nota:** Gli utenti con ruolo **Admin** non hanno accesso a queste API (riceveranno `403 Forbidden`).

---

## 1. Trattative (Negotiations)

### Endpoint Base
`/api/negotiations`

### Recupero Trattative

#### Venditore / Direttore Vendite (Proprie)
Ora entrambi `/api/negotiations` e `/api/negotiations/me` restituiscono solo le trattative personali.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/negotiations/me` | Tutte le trattative dell'utente (solo proprie). |
| `GET` | `/api/negotiations/me/open` | Trattative **APERTE** (solo proprie). |
| `GET` | `/api/negotiations/me/abandoned` | Trattative **ABBANDONATE** (solo proprie). |
| `GET` | `/api/negotiations/me/concluded` | Trattative **CONCLUSE** (solo proprie). |
| `GET` | `/api/negotiations/me/with-coordinates` | Trattative con coordinate (solo proprie). |

Per statistiche team aggregate (solo Direttore): `GET /api/teams/{id}/stats`

### Struttura Risposta (Esempio)
```json
[
    {
        "id": 1,
        "client_id": 10,
        "referente": "Mario Rossi",
        "spanco": "S",
        "importo": 5000,
        "percentuale": 20,
        "attiva": 1,
        "abbandonata": 0,
        "note": "Interessato al prodotto X",
        "data_apertura": "2023-10-01",
        "client": { ... }, // Dati Cliente
        "files": [ ... ]   // Allegati
    }
]
```

### Gestione Trattative (CRUD)

| Metodo | Endpoint | Descrizione | Body (Esempio) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/negotiations` | Crea nuova trattativa | `{"client_id": 1, "referente": "Mario", "spanco": "S", "importo": 1000}` |
| `GET` | `/api/negotiations/{id}` | Dettaglio trattativa | - |
| `PUT` | `/api/negotiations/{id}` | Aggiorna trattativa | `{"spanco": "P", "percentuale": 50, "abbandonata": 0}` |
| `DELETE` | `/api/negotiations/{id}` | Elimina trattativa | - |

---

## 2. Clienti (Clients)

### Endpoint Base
`/api/clients`

### Recupero Clienti

#### Venditore / Direttore Vendite (Propri)
Ora entrambi `/api/clients` e `/api/clients/me` restituiscono solo i clienti personali.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/clients/me` | Tutti i clienti dell'utente (solo propri, ordinati per ragione sociale). |
| `GET` | `/api/clients/without-negotiations` | Clienti senza trattative (solo propri). |

### Struttura Risposta (Esempio)
**Ogni cliente include sempre l'oggetto `address`.**

```json
[
    {
        "id": 5,
        "ragione_sociale": "Azienda SPA",
        "email": "info@azienda.it",
        "p_iva": "12345678901",
        "telefono": "021234567",
        "company_id": 1,
        "user_id": 2,
        "address": {
            "id": 3,
            "client_id": 5,
            "indirizzo": "Via Roma 10",
            "citta": "Milano",
            "CAP": "20100",
            "provincia": "MI",
            "regione": "Lombardia"
        }
    }
]
```

### Gestione Clienti (CRUD)

| Metodo | Endpoint | Descrizione | Body (Esempio) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/clients` | Crea nuovo cliente + indirizzo | Vedere sotto |
| `GET` | `/api/clients/{id}` | Dettaglio cliente | - |
| `PUT` | `/api/clients/{id}` | Aggiorna cliente + indirizzo | Vedere sotto |
| `DELETE` | `/api/clients/{id}` | Elimina cliente | - |

#### Payload Creazione/Aggiornamento (POST/PUT)
È possibile inviare i dati dell'indirizzo direttamente nel corpo della richiesta. Il backend gestirà automaticamente la creazione o l'aggiornamento della tabella `addresses`.

```json
{
    "ragione_sociale": "Nuova Ragione Sociale",
    "email": "nuova@email.it",
    "telefono": "3331234567",
    
    // Campi Indirizzo (Opzionali ma raccomandati)
    "indirizzo": "Via Nuova 25",
    "citta": "Torino",
    "cap": "10100",
    "provincia": "TO",
    "regione": "Piemonte"
}
```
***Nota:** Anche se l'indirizzo non esiste, inviando questi campi verrà creato.*

---

## 3. Team

> **Ruolo richiesto:** Direttore Vendite (salvo dove diversamente specificato).  
> Gli utenti con ruolo **Admin** non hanno accesso alle API di trattative/clienti/team (ricevono `403 Forbidden`).

### 3.1 Struttura Team e permessi

Ogni team è composto da:
- un **creator** (sempre un Direttore Vendite della company)
- un insieme di **membri** (venditori e altri direttori della stessa company)
- un flag `creator_participates` che indica se il creatore partecipa come membro effettivo.

**Regole di accesso principali:**
- **Direttore Vendite**
  - può creare, leggere, aggiornare ed eliminare team della propria company
  - può gestire i membri dei propri team
  - può leggere statistiche aggregate del team e dei singoli membri.
- **Venditore**
  - può leggere solo i team a cui appartiene come membro effettivo.
- **Admin**
  - nessun accesso a queste API (403).

---

### 3.2 Gestione Team (CRUD)

#### Endpoint Base
`/api/teams`

#### Lista team company (Direttore)

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/teams` | Tutti i team della company del Direttore Vendite. |

**Risposta (semplificata):**
```json
[
  {
    "id": 1,
    "nome": "Team Nord",
    "description": "Area Nord Italia",
    "company_id": 1,
    "creator_id": 10,
    "creator_participates": true,
    "users_count": 4,
    "effective_members_count": 5,
    "creator": {
      "id": 10,
      "nome": "Mario",
      "cognome": "Rossi"
    }
  }
]
```

#### I miei team (Direttore / Venditore)

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/teams/my-teams` | Team a cui l'utente è assegnato (come membro o creator che partecipa). |

**Risposta (minimal):**
```json
[
  {
    "id": 1,
    "nome": "Team Nord",
    "creator_name": "Mario Rossi"
  }
]
```

#### Dettaglio team

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/teams/{id}` | Dettaglio completo di un team (inclusi membri). |

**Risposta (estratto):**
```json
{
  "id": 1,
  "nome": "Team Nord",
  "description": "Area Nord Italia",
  "company_id": 1,
  "creator_id": 10,
  "creator_participates": true,
  "users_count": 4,
  "effective_members_count": 5,
  "creator": {
    "id": 10,
    "nome": "Mario",
    "cognome": "Rossi"
  },
  "users": [
    {
      "id": 11,
      "nome": "Luca",
      "cognome": "Bianchi",
      "email": "luca@example.com",
      "pivot": {
        "team_id": 1,
        "user_id": 11,
        "created_at": "2026-01-10T10:00:00Z",
        "updated_at": "2026-01-10T10:00:00Z"
      }
    }
  ]
}
```

#### Creazione team

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/teams` | Crea un nuovo team nella company del Direttore Vendite. |

**Body:**
```json
{
  "nome": "Team Nord",
  "description": "Area Nord Italia",
  "creator_participates": true,
  "members": [11, 12, 13]
}
```

#### Aggiornamento team

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `PUT` | `/api/teams/{id}` | Aggiorna i dati di un team esistente. |

**Body (tutti i campi opzionali):**
```json
{
  "nome": "Nuovo nome",
  "description": "Nuova descrizione",
  "creator_participates": false,
  "members": [11, 14] // sync completo: sostituisce i membri esistenti
}
```

#### Vincolo su `creator_participates`

> **Update — 2026-03-09 — Teams**  
> Solo il **creatore del team** può modificare il flag `creator_participates`.

| Caso | Risultato |
| --- | --- |
| Creatore del team invia `creator_participates` | `200 OK` — flag aggiornato |
| Altro Direttore della stessa company invia `creator_participates` | `403 Forbidden` |
| Altro Direttore invia solo `nome` / `description` | `200 OK` |

**Errore 403:**
```json
HTTP 403
{
  "message": "Solo il creatore del team può modificare la propria partecipazione."
}
```

#### Eliminazione team

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `DELETE` | `/api/teams/{id}` | Elimina un team e le relative associazioni (pivot). |

---

### 3.3 Gestione membri del team

#### Membri disponibili

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/teams/available-members` | Utenti della company assegnabili come membri (venditori + altri direttori, escluso l'utente corrente). |

#### Aggiungere membri (senza rimuovere esistenti)

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `POST` | `/api/teams/{id}/members` | Aggiunge uno o più membri al team **senza** rimuovere quelli esistenti. |

**Body:**
```json
{
  "members": [11, 12]
}
```

#### Rimuovere un membro

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `DELETE` | `/api/teams/{id}/members/{userId}` | Rimuove un singolo membro dal team. |

**Risposta:** il team aggiornato, con la lista `users` allineata.

---

### 3.4 Statistiche del team — GET `/api/teams/{id}/stats`

> **Ruolo richiesto:** Direttore Vendite  
> I KPI sono **identici** a quelli della dashboard personale, ma calcolati sui **membri effettivi** del team.

**Risposta:**
```json
{
  "team_id": 1,
  "effective_members_count": 5,
  "total_open_negotiations": 12,
  "conclusion_percentage": 36.84,
  "average_open_amount": 4200.0,
  "average_concluded_amount": 7800.0,
  "total_open_amount": 50400.0,
  "average_closing_days": 28.3
}
```

| Campo | Definizione |
| --- | --- |
| `total_open_negotiations` | Numero trattative aperte: `spanco != 'O'` **AND** `percentuale < 100` **AND** `abbandonata = false`. |
| `conclusion_percentage` | `(concluse / totale non abbandonate) × 100` (solo trattative non abbandonate). |
| `average_open_amount` | Media importo delle trattative aperte con `importo > 0`. |
| `average_concluded_amount` | Media importo delle trattative concluse con `importo > 0`. |
| `total_open_amount` | Somma importo trattative aperte. |
| `average_closing_days` | Media dei giorni tra `data_apertura` e `data_chiusura` sulle trattative concluse. |

> Trattativa **conclusa** = `spanco = 'O'` **oppure** `percentuale = 100`.  
> Le trattative **abbandonate** (`abbandonata = true`) sono escluse da **tutti** i calcoli.

**Nota:** rispetto a versioni precedenti, la risposta **non** include più campi come `member_ids`, `pipeline`, `concluded`, `abandoned`. I soli KPI di riferimento sono quelli sopra elencati.

---

### 3.5 SPANCO del team — GET `/api/teams/{id}/spanco`

> **Ruolo richiesto:** Direttore Vendite  
> Distribuzione delle trattative per fase SPANCO, aggregata su tutti i membri effettivi del team (escluse le abbandonate).

**Risposta:**
```json
{
  "S": 8,
  "P": 12,
  "A": 5,
  "N": 3,
  "C": 7,
  "O": 18
}
```

Il formato è lo stesso dello SPANCO personale (`GET /api/statistics/negotiations/spanco`):
- chiavi = lettere SPANCO presenti (S, P, A, N, C, O)
- valori = conteggio trattative per stato.

---

### 3.6 Supervisione singolo membro del team

> **Ruolo richiesto:** Direttore Vendite  
> Il Direttore può accedere ai dati di un venditore **solo se** è membro effettivo del team indicato.  
> Se il membro **non appartiene** al team → `403 Forbidden`.

#### KPI del membro — GET `/api/teams/{teamId}/members/{memberId}/stats`

Restituisce gli stessi 6 KPI della dashboard personale, riferiti al singolo venditore nel contesto del team.

**Risposta:**
```json
{
  "member_id": 2,
  "total_open_negotiations": 8,
  "conclusion_percentage": 42.1,
  "average_open_amount": 3800.0,
  "average_concluded_amount": 6500.0,
  "total_open_amount": 30400.0,
  "average_closing_days": 22.5
}
```

#### SPANCO del membro — GET `/api/teams/{teamId}/members/{memberId}/spanco`

Distribuzione SPANCO personale del venditore (stesso formato della dashboard personale, escluse trattative abbandonate).

**Risposta:**
```json
{
  "S": 2,
  "P": 3,
  "A": 1,
  "N": 0,
  "C": 2,
  "O": 5
}
```

#### Trattative del membro — GET `/api/teams/{teamId}/members/{memberId}/negotiations`

Elenca **tutte** le trattative del venditore (tutte le fasi, incluse abbandonate e concluse).

**Risposta (esempio):**
```json
[
  {
    "id": 10,
    "referente": "Mario Verdi",
    "spanco": "P",
    "importo": 4000.0,
    "percentuale": 40,
    "attiva": true,
    "abbandonata": false,
    "note": "...",
    "data_apertura": "2026-01-15",
    "data_chiusura": null,
    "client": {
      "id": 5,
      "ragione_sociale": "Acme Srl"
    },
    "files": [
      { "id": 1, "file_name": "preventivo.pdf" }
    ]
  }
]
```

#### Mappa trattative membro — GET `/api/teams/{teamId}/members/{memberId}/map`

Restituisce le trattative **non abbandonate** del venditore con le coordinate geografiche del cliente, per uso in mappa.

**Risposta (esempio):**
```json
[
  {
    "id": 10,
    "referente": "Mario Verdi",
    "spanco": "P",
    "client": {
      "id": 5,
      "ragione_sociale": "Acme Srl",
      "address": {
        "indirizzo": "Via Roma 10",
        "citta": "Milano",
        "latitude": 45.4654,
        "longitude": 9.1859
      }
    }
  }
]
```

Note:
- Solo le trattative con `abbandonata = false` sono incluse.
- I clienti senza coordinate (`latitude = null` / `longitude = null`) possono essere presenti, ma senza dati geografici utilizzabili sulla mappa.
