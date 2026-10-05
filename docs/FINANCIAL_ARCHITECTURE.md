# Arquitectura Financiera y Diseño de Ledger Inmutable — Bingo Club VNZLA Online

## 1. Principio Fundamental de Seguridad Financiera
**CERO CONFIANZA EN COLUMNAS DE SALDO MUTABLES:**
En plataformas de alta concurrencia, una columna única como `users.balance` es una fuente de vulnerabilidad crítica ante condiciones de carrera (race conditions), desincronización y fraude.

En **Bingo Club VNZLA Online**, el saldo disponible es una proyección verificable calculada a partir de un **Ledger Contable de Doble Entrada (Append-Only Transaction Ledger)**:

$$\text{Saldo Verificado} = \sum(\text{Créditos}) - \sum(\text{Débitos})$$

---

## 2. Moneda Oficial y Reglas de Pronunciación (TTS/Audio)
- **Símbolo Oficial Escrito**: `Bs.` (Ejemplo: `Bs. 50,00`).
- **Código ISO**: `VES` (Bolívar Soberano / Digital).
- **Regla Estricta de Pronunciación en Motores de Voz (TTS) y Locución de Salas**:
  - **CORRECTO**: *"Cincuenta bolívares"* o *"Premio acumulado de quinientos bolívares"*.
  - **ESTRICTAMENTE PROHIBIDO**: Pronunciar *"Bes"* o *"Bé-ese"*.
  - **ESTRICTAMENTE PROHIBIDO**: Pronunciar *"bolivianos"* (moneda de Bolivia).
  - Toda síntesis de voz en Fase 2 y 3 debe preprocesar el texto para convertir la abreviatura `Bs.` en la palabra completa `bolívares`.

---

## 3. Especificación del Ledger (`wallet_transactions`)

Cada asiento en el ledger financiero es inmutable y forma una cadena criptográfica de hashes para garantizar la no alteración del historial:

```typescript
interface WalletTransactionLedgerEntry {
  id: string; // UUID v4 único
  wallet_id: string; // FK a wallets(id)
  user_id: string; // FK a auth.users(id)
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CARD_PURCHASE' | 'PRIZE_PAYOUT' | 'REFUND' | 'ADJUSTMENT';
  amount: number; // Monto exacto (precisión numérica de 2 decimales)
  currency: 'VES'; // Moneda oficial bolívares
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'SETTLED';
  reference: string; // Código de transacción bancaria / hash blockchain
  idempotency_key: string; // Clave única de prevención de duplicados
  created_at: string; // Timestamp ISO 8601 UTC
  created_by: string; // Actor de la operación (User ID o 'SYSTEM_ENGINE')
  metadata: Record<string, any>; // Detalles adicionales (método de pago, IP anonimizada)
  previous_hash: string; // Hash SHA-256 de la transacción precedente de esta billetera
  transaction_hash: string; // SHA-256(id + wallet_id + type + amount + previous_hash + created_at)
}
```

---

## 4. Cadena de Integridad Criptográfica (Hash Chaining)
Para verificar que ningún registro del ledger ha sido modificado retroactivamente:
1. La primera transacción de una billetera contiene `previous_hash = "GENESIS_HASH"`.
2. Cada transacción subsiguiente $N$ calcula su hash:
   $$\text{hash}_N = \text{SHA256}(\text{id} \parallel \text{wallet\_id} \parallel \text{amount} \parallel \text{type} \parallel \text{created\_at} \parallel \text{hash}_{N-1})$$
3. Un proceso periódico de reconciliación en segundo plano valida que la cadena de hashes sea continua e íntegra.

---

## 5. Prevención de Saldo Negativo y Doble Gasto
- Toda operación de débito (compra de cartones o solicitud de retiro) ejecuta:
  ```sql
  SELECT balance_available FROM wallets WHERE id = p_wallet_id FOR UPDATE;
  ```
- Si `balance_available < p_amount`, la transacción aborta inmediatamente con excepción de base de datos.
- La restricción de integridad `CHECK (balance_available >= 0)` a nivel de esquema garantiza que ninguna transacción pueda violar el balance mínimo.
