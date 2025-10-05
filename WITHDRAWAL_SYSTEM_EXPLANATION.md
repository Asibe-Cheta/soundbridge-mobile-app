# 🏦 **COMPLETE WITHDRAWAL SYSTEM EXPLANATION**

## 📋 **OVERVIEW**
This document explains how the withdrawal system works, where money goes, and how we collect and manage bank account details for secure withdrawals.

---

## 💰 **WHERE MONEY GOES**

### **Complete Money Flow:**
```
User's Wallet → Withdrawal Method → User's Bank Account
     ↓              ↓                    ↓
Platform Wallet → Payment Processor → User's Bank
```

### **Step-by-Step Process:**
1. **User requests withdrawal** from their wallet
2. **System validates** withdrawal method and amount
3. **Money is transferred** to user's bank account via payment processor
4. **Transaction is recorded** and status updated
5. **User receives confirmation** of successful withdrawal

---

## 🔧 **HOW WE COLLECT BANK DETAILS**

### **1. Withdrawal Method Collection**

#### **Bank Transfer Details:**
```typescript
interface BankDetails {
  account_holder_name: string;    // "John Doe"
  bank_name: string;              // "Bank of America"
  account_number: string;         // "123456789" (encrypted)
  routing_number: string;         // "123456789" (encrypted)
  account_type: 'checking' | 'savings';
  currency: string;               // "USD"
}
```

#### **PayPal Details:**
```typescript
interface PayPalDetails {
  email: string;                  // "user@example.com"
}
```

#### **Crypto Details:**
```typescript
interface CryptoDetails {
  address: string;                // "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  currency: string;               // "BTC", "ETH", "USDT"
  network: string;                // "Bitcoin", "Ethereum"
}
```

#### **Prepaid Card Details:**
```typescript
interface CardDetails {
  card_number: string;            // "1234567890123456" (encrypted)
  card_holder_name: string;       // "John Doe"
  expiry_date: string;            // "12/25"
  cvv: string;                    // "123" (encrypted)
}
```

### **2. Data Collection Process**

#### **Step 1: User Interface**
- User navigates to "Withdrawal Methods" section
- Clicks "Add Withdrawal Method"
- Selects method type (Bank, PayPal, Crypto, Card)
- Fills in required details

#### **Step 2: Data Validation**
```typescript
// Validate bank account number
const validateAccountNumber = (accountNumber: string) => {
  return /^\d{8,17}$/.test(accountNumber); // 8-17 digits
};

// Validate routing number
const validateRoutingNumber = (routingNumber: string) => {
  return /^\d{9}$/.test(routingNumber); // Exactly 9 digits
};

// Validate email
const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

#### **Step 3: Data Encryption**
```typescript
// Encrypt sensitive data before storage
const encryptSensitiveData = (data: string) => {
  // Use AES-256 encryption
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

// Store encrypted data
const encryptedDetails = {
  account_number: encryptSensitiveData(bankDetails.account_number),
  routing_number: encryptSensitiveData(bankDetails.routing_number),
  cvv: encryptSensitiveData(cardDetails.cvv)
};
```

#### **Step 4: Database Storage**
```sql
INSERT INTO wallet_withdrawal_methods (
  user_id,
  method_type,
  method_name,
  encrypted_details,
  is_verified,
  is_default
) VALUES (
  'user-uuid',
  'bank_transfer',
  'My Bank Account',
  '{"account_holder_name": "John Doe", "bank_name": "Bank of America", "account_number": "encrypted", "routing_number": "encrypted"}',
  false,
  false
);
```

---

## 🔐 **SECURITY PROTOCOLS**

### **1. Data Encryption**
- **AES-256 encryption** for all sensitive data
- **Separate encryption keys** for different data types
- **Key rotation** every 90 days
- **Hardware Security Modules (HSM)** for key management

### **2. Access Control**
- **Row Level Security (RLS)** in Supabase
- **User-specific access** to their own data only
- **API authentication** required for all operations
- **Audit logging** for all data access

### **3. Compliance Standards**
- **PCI DSS** for card data handling
- **GDPR** for data protection
- **SOC 2** for security controls
- **KYC/AML** for user verification

---

## 💳 **PAYMENT PROCESSING**

### **1. Stripe Connect Integration**

#### **For Bank Transfers:**
```typescript
// Create transfer to user's connected account
const transfer = await stripe.transfers.create({
  amount: withdrawalAmount * 100, // Convert to cents
  currency: 'usd',
  destination: userStripeAccountId, // User's Stripe Connect account
  transfer_group: `withdrawal_${transactionId}`,
  metadata: {
    transaction_id: transactionId,
    user_id: userId,
    withdrawal_method: 'bank_transfer'
  }
});
```

#### **For PayPal:**
```typescript
// PayPal Payout API integration
const payout = await paypal.payouts.create({
  sender_batch_header: {
    sender_batch_id: `withdrawal_${transactionId}`,
    email_subject: 'SoundBridge Withdrawal'
  },
  items: [{
    recipient_type: 'EMAIL',
    amount: {
      value: withdrawalAmount.toString(),
      currency: 'USD'
    },
    receiver: userPayPalEmail,
    note: 'Withdrawal from SoundBridge wallet'
  }]
});
```

#### **For Crypto:**
```typescript
// Crypto exchange API integration
const cryptoTransfer = await cryptoExchange.transfer({
  currency: cryptoCurrency,
  amount: withdrawalAmount,
  destination: userCryptoAddress,
  network: cryptoNetwork
});
```

### **2. Transaction Processing Flow**

#### **Step 1: Validation**
```typescript
const validateWithdrawal = async (userId: string, amount: number, methodId: string) => {
  // Check user has sufficient balance
  const wallet = await getWallet(userId);
  if (wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Check withdrawal method is verified
  const method = await getWithdrawalMethod(methodId);
  if (!method.is_verified) {
    throw new Error('Withdrawal method not verified');
  }
  
  // Check minimum withdrawal amount
  if (amount < MINIMUM_WITHDRAWAL) {
    throw new Error('Amount below minimum withdrawal');
  }
};
```

#### **Step 2: Transaction Creation**
```typescript
const createWithdrawalTransaction = async (userId: string, amount: number, methodId: string) => {
  const transaction = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: userId,
      transaction_type: 'withdrawal',
      amount: -amount, // Negative for withdrawal
      currency: 'USD',
      description: 'Wallet withdrawal',
      status: 'pending',
      metadata: {
        withdrawal_method_id: methodId,
        processed_at: new Date().toISOString()
      }
    })
    .select()
    .single();
    
  return transaction;
};
```

#### **Step 3: Payment Processing**
```typescript
const processWithdrawal = async (transactionId: string, methodId: string) => {
  const transaction = await getTransaction(transactionId);
  const method = await getWithdrawalMethod(methodId);
  
  let transferResult;
  
  switch (method.method_type) {
    case 'bank_transfer':
      transferResult = await processBankTransfer(transaction, method);
      break;
    case 'paypal':
      transferResult = await processPayPalTransfer(transaction, method);
      break;
    case 'crypto':
      transferResult = await processCryptoTransfer(transaction, method);
      break;
    case 'prepaid_card':
      transferResult = await processCardTransfer(transaction, method);
      break;
  }
  
  if (transferResult.success) {
    await updateTransactionStatus(transactionId, 'completed');
    await updateWalletBalance(transaction.user_id, -transaction.amount);
  } else {
    await updateTransactionStatus(transactionId, 'failed');
  }
};
```

---

## 📊 **DATABASE SCHEMA**

### **Withdrawal Methods Table**
```sql
CREATE TABLE wallet_withdrawal_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  method_type VARCHAR(20) NOT NULL, -- 'bank_transfer', 'paypal', 'crypto', 'prepaid_card'
  method_name VARCHAR(100) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  encrypted_details JSONB NOT NULL, -- Encrypted withdrawal details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Wallet Transactions Table**
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES user_wallets(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'tip_received', etc.
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description TEXT,
  reference_id VARCHAR(255), -- External reference (Stripe transfer ID, etc.)
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
  metadata JSONB, -- Additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🚀 **API ENDPOINTS**

### **1. Get Withdrawal Methods**
```http
GET /api/wallet/withdrawal-methods
Authorization: Bearer {token}

Response:
{
  "methods": [
    {
      "id": "uuid",
      "method_type": "bank_transfer",
      "method_name": "My Bank Account",
      "is_verified": true,
      "is_default": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### **2. Add Withdrawal Method**
```http
POST /api/wallet/withdrawal-methods
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "method_type": "bank_transfer",
  "method_name": "My Bank Account",
  "bank_details": {
    "account_holder_name": "John Doe",
    "bank_name": "Bank of America",
    "account_number": "123456789",
    "routing_number": "123456789",
    "account_type": "checking",
    "currency": "USD"
  }
}

Response:
{
  "success": true,
  "method": {
    "id": "uuid",
    "method_type": "bank_transfer",
    "method_name": "My Bank Account",
    "is_verified": false,
    "is_default": false
  },
  "message": "Withdrawal method added successfully"
}
```

### **3. Process Withdrawal**
```http
POST /api/wallet/process-withdrawal
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "transaction_id": "uuid",
  "withdrawal_method_id": "uuid"
}

Response:
{
  "success": true,
  "transferId": "tr_1234567890",
  "message": "Withdrawal processed successfully"
}
```

---

## 🔍 **VERIFICATION PROCESS**

### **1. Bank Account Verification**
- **Micro-deposits**: Send small amounts (e.g., $0.01, $0.02) to verify account
- **User confirmation**: User enters exact amounts received
- **Account validation**: Verify account holder name matches
- **Routing number validation**: Verify bank and routing number

### **2. PayPal Verification**
- **Email verification**: Send verification email to PayPal address
- **Account status check**: Verify PayPal account is active and verified
- **Balance check**: Ensure PayPal account can receive payments

### **3. Crypto Verification**
- **Address validation**: Verify crypto address format and network
- **Network check**: Ensure address is valid for selected network
- **Balance check**: Verify address can receive the selected cryptocurrency

### **4. Card Verification**
- **Card validation**: Verify card number using Luhn algorithm
- **Expiry check**: Ensure card is not expired
- **CVV validation**: Verify CVV format
- **Issuer check**: Verify card issuer and network

---

## 📱 **MOBILE APP INTEGRATION**

### **1. Withdrawal Method Collection**
```typescript
// Bank Transfer Form
const BankTransferForm = () => {
  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    currency: 'USD'
  });

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/wallet/withdrawal-methods', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method_type: 'bank_transfer',
          method_name: 'My Bank Account',
          bank_details: formData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Withdrawal method added successfully!');
        // Refresh withdrawal methods list
        loadWithdrawalMethods();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add withdrawal method');
    }
  };

  return (
    <View style={styles.form}>
      <TextInput
        placeholder="Account Holder Name"
        value={formData.account_holder_name}
        onChangeText={(text) => setFormData({...formData, account_holder_name: text})}
        style={styles.input}
      />
      <TextInput
        placeholder="Bank Name"
        value={formData.bank_name}
        onChangeText={(text) => setFormData({...formData, bank_name: text})}
        style={styles.input}
      />
      <TextInput
        placeholder="Account Number"
        value={formData.account_number}
        onChangeText={(text) => setFormData({...formData, account_number: text})}
        style={styles.input}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Routing Number"
        value={formData.routing_number}
        onChangeText={(text) => setFormData({...formData, routing_number: text})}
        style={styles.input}
        keyboardType="numeric"
        maxLength={9}
      />
      <Button title="Add Bank Account" onPress={handleSubmit} />
    </View>
  );
};
```

### **2. Withdrawal Request**
```typescript
const handleWithdrawal = async (amount: number, methodId: string) => {
  try {
    // Create withdrawal transaction
    const response = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        withdrawal_method_id: methodId,
        description: 'Mobile app withdrawal'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      Alert.alert('Success', 'Withdrawal request submitted successfully!');
      // Process the withdrawal
      await processWithdrawal(result.transactionId, methodId);
    } else {
      Alert.alert('Error', result.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to process withdrawal');
  }
};
```

---

## 🎯 **SUMMARY**

### **Complete Withdrawal Flow:**
1. **User adds withdrawal method** (Bank, PayPal, Crypto, Card)
2. **System encrypts and stores** sensitive details securely
3. **User requests withdrawal** from their wallet
4. **System validates** amount and method
5. **Payment processor transfers** money to user's account
6. **Transaction is recorded** and status updated
7. **User receives confirmation** of successful withdrawal

### **Security Features:**
- **AES-256 encryption** for all sensitive data
- **Row Level Security** for database access
- **API authentication** for all operations
- **Audit logging** for compliance
- **PCI DSS compliance** for card data

### **Supported Methods:**
- **Bank Transfer**: Direct to user's bank account
- **PayPal**: Transfer to user's PayPal account
- **Cryptocurrency**: Transfer to user's crypto wallet
- **Prepaid Cards**: Transfer to user's prepaid card

This system provides a complete, secure, and compliant withdrawal solution that handles all the complexities of collecting bank details and processing payments safely! 🚀
