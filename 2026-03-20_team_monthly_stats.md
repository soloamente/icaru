# API Reference — Statistiche Mensili Team + Export

> Tutte le chiamate richiedono autenticazione Bearer Token (`Authorization: Bearer {token}`).
> Ruolo richiesto: **Direttore Vendite**. Tutti gli altri ruoli ricevono `403`.
> `{team}` è sempre l'ID numerico del team. Se il team non appartiene alla company del direttore → `403`.

---

## 1. Statistiche mensili team

```
GET /api/teams/{team}/monthly
```

**Filtri opzionali (query string):**

| Parametro | Tipo | Esempio | Descrizione |
|---|---|---|---|
| `user_id` | `integer` | `?user_id=5` | Restringe i dati a un singolo membro del team. Se l'utente non è membro effettivo → `422`. Omesso = tutti i membri. |

**Risposta `200 OK` — `application/json`:**
```json
{
  "years": [2024, 2025],
  "data": {
    "2025": [
      {
        "month": 1,
        "open_count": 5,
        "open_amount": 28000.00,
        "concluded_count": 3,
        "concluded_amount": 12000.00
      }
    ]
  },
  "storico": [
    {
      "month": 1,
      "open_count": 11,
      "open_amount": 55000.00,
      "concluded_count": 7,
      "concluded_amount": 29000.00
    }
  ],
  "members": [
    { "id": 4, "nome": "Luca", "cognome": "Bianchi" },
    { "id": 7, "nome": "Sara", "cognome": "Verdi" }
  ]
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `years` | `number[]` | Lista anni con trattative nel team |
| `data` | `object` | Dati per anno → array di 12 oggetti (mesi vuoti = 0) |
| `data[anno][].month` | `number` | Numero mese (1–12) |
| `data[anno][].open_count` | `number` | N° trattative aperte con `data_apertura` in quel mese |
| `data[anno][].open_amount` | `number` | Importo totale trattative aperte |
| `data[anno][].concluded_count` | `number` | N° trattative concluse con `data_chiusura` in quel mese |
| `data[anno][].concluded_amount` | `number` | Importo totale trattative concluse |
| `storico` | `object[]` | Array di 12 oggetti — somma di tutti gli anni per ogni mese |
| `members` | `object[]` | Lista membri effettivi del team (per popolare il dropdown venditore) |

> `members` contiene sempre tutti i membri del team, indipendentemente dal filtro `user_id` applicato.
> Trattative abbandonate escluse. `creator_participates` rispettato (il direttore è incluso se il flag è attivo).

---

## 2. Export PDF statistiche team

```
GET /api/teams/{team}/export/pdf
```

**Filtri opzionali (query string):**

| Parametro | Tipo | Esempio | Descrizione |
|---|---|---|---|
| `year` | `string` | `?year=2025` | Anno da visualizzare. Omesso o `storico` → dati aggregati di tutti gli anni |
| `user_id` | `integer` | `?user_id=5` | Restringe i grafici a un singolo membro del team |

**Risposta `200 OK`:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="statistiche-team-YYYY-MM-DD.pdf"`
- Body: file PDF binario

Stesso formato del PDF personale (3 grafici A4: importo mensile, numero trattative mensile, donut SPANCO). Il campo intestazione mostra il nome del team al posto del nome utente.

**Esempio fetch:**
```js
const res = await fetch(`/api/teams/${teamId}/export/pdf?year=2025`, {
  headers: { Authorization: `Bearer ${token}` }
});
const blob = await res.blob();
const url = URL.createObjectURL(blob);
```

---

## 3. Export Excel trattative team

```
GET /api/teams/{team}/export/excel
```

**Filtri opzionali (query string):**

| Parametro | Tipo | Esempio | Descrizione |
|---|---|---|---|
| `user_id` | `integer` | `?user_id=5` | Restringe l'export a un singolo membro del team |

**Risposta `200 OK`:**
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="trattative-team-YYYY-MM-DD.xlsx"`
- Body: file `.xlsx` binario

Stesso formato del file Excel personale con l'aggiunta della colonna **Venditore** in prima posizione. Le righe sono ordinate per cognome venditore → nome venditore → data apertura.

| # | Intestazione | Contenuto |
|---|---|---|
| A | Venditore | Nome e cognome del venditore proprietario della trattativa |
| B | Cliente | Ragione sociale del cliente |
| C | Referente | Nome referente della trattativa |
| D | Data Apertura | Formato `gg/mm/AAAA` |
| E | Data Chiusura | Formato `gg/mm/AAAA` (vuoto se non conclusa) |
| F | Data Abbandono | Formato `gg/mm/AAAA` (vuoto se non abbandonata) |
| G | Telefono | Telefono del cliente |
| H | Spanco | Lettera: S / P / A / N / C / O |
| I | Importo (€) | Numero con 2 decimali |
| J | Percentuale | Es. `40%` |
| K | Stato | `Aperta` / `Conclusa` / `Abbandonata` |

---

## 4. Export Mappa HTML trattative team

```
GET /api/teams/{team}/export/map
```

**Filtri opzionali (query string):**

| Parametro | Tipo | Esempio | Descrizione |
|---|---|---|---|
| `user_id` | `integer` | `?user_id=5` | Restringe la mappa a un singolo membro del team |
| `spanco` | `string` o `string[]` | `?spanco=S` oppure `?spanco[]=S&spanco[]=P` | Filtra per lettera spanco |
| `percentuale` | `integer` | `?percentuale=40` | Valore esatto: 0, 20, 40, 60, 80 o 100 |
| `importo_min` | `float` | `?importo_min=1000` | Importo ≥ valore |
| `importo_max` | `float` | `?importo_max=50000` | Importo ≤ valore |

> Trattative abbandonate sempre escluse. Vengono plottate solo quelle con coordinate valide.

**Risposta `200 OK`:**
- `Content-Type: text/html; charset=UTF-8`
- `Content-Disposition: attachment; filename="mappa-team-YYYY-MM-DD.html"`
- Body: file `.html` self-contained (Leaflet inlineato)

Stesso formato della mappa personale. L'intestazione della mappa mostra il nome del team al posto del nome utente.
