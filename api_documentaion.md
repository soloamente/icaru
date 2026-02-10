# Documentazione API - Trattative e Clienti

## Autenticazione
Tutte le chiamate richiedono il token di autenticazione (Bearer Token).
**Nota:** Gli utenti con ruolo **Admin** non hanno accesso a queste API (riceveranno `403 Forbidden`).

---

## 1. Trattative (Negotiations)

### Endpoint Base
`/api/negotiations`

### Recupero Trattative

#### A. Venditore / Direttore Vendite (Proprie)
Recupera le trattative assegnate all'utente loggato.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/negotiations/me` | Tutte le trattative dell'utente. |
| `GET` | `/api/negotiations/me/open` | Trattative **APERTE** (Spanco != 'O' AND % < 100 AND non abbandonate). |
| `GET` | `/api/negotiations/me/abandoned` | Trattative **ABBANDONATE** (`abbandonata` = true). |
| `GET` | `/api/negotiations/me/concluded` | Trattative **CONCLUSE** (Spanco = 'O' OR % = 100). |

#### B. Direttore Vendite (Tutta l'Azienda)
Recupera tutte le trattative dell'azienda.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/negotiations/company` | Tutte le trattative dell'azienda (solo per Direttore Vendite). |

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

#### A. Venditore / Direttore Vendite (Propri)
Recupera i clienti assegnati all'utente loggato.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/clients/me` | Tutti i clienti dell'utente (ordinati per ragione sociale). |

#### B. Direttore Vendite (Tutta l'Azienda)
Recupera tutti i clienti dell'azienda.

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/clients/company` | Tutti i clienti dell'azienda (solo per Direttore Vendite). |

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