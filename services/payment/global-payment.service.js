/**
 * Global Payment Service
 * Multi-currency, multi-provider payment processing
 * Supports: Stripe, PayPal, Cryptocurrency
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

class GlobalPaymentService {
  constructor() {
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID;
    this.cryptoEnabled = process.env.CRYPTO_PAYMENT_ENABLED === 'true';
    this.supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
    this.cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'USDC'];
  }

  /**
   * Create payment intent
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment intent
   */
  async createPaymentIntent({
    amount,
    currency = 'USD',
    paymentMethod = 'stripe',
    metadata = {},
    customerId,
    description,
  }) {
    // Normalize currency
    currency = currency.toUpperCase();

    // Validate currency
    if (!this.isCurrencySupported(currency, paymentMethod)) {
      throw new Error(`Currency ${currency} not supported for ${paymentMethod}`);
    }

    // Convert amount based on currency
    const normalizedAmount = this.normalizeAmount(amount, currency);

    switch (paymentMethod.toLowerCase()) {
      case 'stripe':
        return await this.createStripePaymentIntent({
          amount: normalizedAmount,
          currency: currency.toLowerCase(),
          metadata,
          customerId,
          description,
        });

      case 'paypal':
        return await this.createPayPalPayment({
          amount: normalizedAmount,
          currency,
          metadata,
          description,
        });

      case 'crypto':
        return await this.createCryptoPayment({
          amount: normalizedAmount,
          currency,
          metadata,
          description,
        });

      default:
        throw new Error(`Payment method ${paymentMethod} not supported`);
    }
  }

  /**
   * Process payment
   * @param {String} paymentIntentId - Payment intent ID
   * @param {String} paymentMethod - Payment method
   * @param {Object} paymentData - Additional payment data
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentIntentId, paymentMethod, paymentData = {}) {
    switch (paymentMethod.toLowerCase()) {
      case 'stripe':
        return await this.confirmStripePayment(paymentIntentId, paymentData);

      case 'paypal':
        return await this.confirmPayPalPayment(paymentIntentId, paymentData);

      case 'crypto':
        return await this.confirmCryptoPayment(paymentIntentId, paymentData);

      default:
        throw new Error(`Payment method ${paymentMethod} not supported`);
    }
  }

  /**
   * Get exchange rate
   * @param {String} fromCurrency - From currency
   * @param {String} toCurrency - To currency
   * @returns {Promise<Number>} Exchange rate
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;

    try {
      // Use exchange rate API (e.g., exchangerate-api.com, fixer.io)
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
      );
      return response.data.rates[toCurrency] || 1;
    } catch (error) {
      console.error('Exchange rate error:', error);
      // Fallback to 1:1 (should use cached rates in production)
      return 1;
    }
  }

  /**
   * Convert amount between currencies
   * @param {Number} amount - Amount to convert
   * @param {String} fromCurrency - From currency
   * @param {String} toCurrency - To currency
   * @returns {Promise<Number>} Converted amount
   */
  async convertAmount(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return Math.round(amount * rate * 100) / 100;
  }

  // Stripe Methods

  async createStripePaymentIntent({ amount, currency, metadata, customerId, description }) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe is not enabled');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        customer: customerId,
        description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        status: paymentIntent.status,
        paymentMethod: 'stripe',
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new Error(`Stripe payment failed: ${error.message}`);
    }
  }

  async confirmStripePayment(paymentIntentId, paymentData) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe is not enabled');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentData.paymentMethodId,
      });

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: 'stripe',
        transactionId: paymentIntent.latest_charge,
      };
    } catch (error) {
      console.error('Stripe payment confirmation error:', error);
      throw new Error(`Stripe payment confirmation failed: ${error.message}`);
    }
  }

  // PayPal Methods

  async createPayPalPayment({ amount, currency, metadata, description }) {
    if (!this.paypalEnabled) {
      throw new Error('PayPal is not enabled');
    }

    try {
      // Get access token
      const accessToken = await this.getPayPalAccessToken();

      const response = await axios.post(
        `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount.toFixed(2),
              },
              description,
              custom_id: metadata.orderId || '',
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        id: response.data.id,
        approvalUrl: response.data.links.find(l => l.rel === 'approve')?.href,
        amount,
        currency,
        status: response.data.status,
        paymentMethod: 'paypal',
      };
    } catch (error) {
      console.error('PayPal payment creation error:', error);
      throw new Error(`PayPal payment failed: ${error.message}`);
    }
  }

  async confirmPayPalPayment(orderId, paymentData) {
    if (!this.paypalEnabled) {
      throw new Error('PayPal is not enabled');
    }

    try {
      const accessToken = await this.getPayPalAccessToken();

      const response = await axios.post(
        `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const capture = response.data.purchase_units[0]?.payments?.captures[0];

      return {
        id: orderId,
        status: response.data.status,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        paymentMethod: 'paypal',
        transactionId: capture.id,
      };
    } catch (error) {
      console.error('PayPal payment confirmation error:', error);
      throw new Error(`PayPal payment confirmation failed: ${error.message}`);
    }
  }

  async getPayPalAccessToken() {
    try {
      const response = await axios.post(
        `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_CLIENT_SECRET,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('PayPal access token error:', error);
      throw new Error('Failed to get PayPal access token');
    }
  }

  // Cryptocurrency Methods

  async createCryptoPayment({ amount, currency, metadata, description }) {
    if (!this.cryptoEnabled) {
      throw new Error('Cryptocurrency payments are not enabled');
    }

    // In production, integrate with crypto payment processors like:
    // - Coinbase Commerce
    // - BitPay
    // - Crypto.com Pay
    // For now, return mock structure

    return {
      id: `crypto_${Date.now()}`,
      address: this.generateCryptoAddress(currency),
      amount,
      currency,
      qrCode: this.generateQRCode(currency, amount),
      status: 'pending',
      paymentMethod: 'crypto',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    };
  }

  async confirmCryptoPayment(paymentId, paymentData) {
    // In production, verify payment on blockchain
    // For now, return mock confirmation

    return {
      id: paymentId,
      status: 'completed',
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      paymentMethod: 'crypto',
    };
  }

  // Helper Methods

  isCurrencySupported(currency, paymentMethod) {
    if (paymentMethod === 'crypto') {
      return this.cryptoCurrencies.includes(currency);
    }
    return this.supportedCurrencies.includes(currency);
  }

  normalizeAmount(amount, currency) {
    // Some currencies don't use decimals (JPY, KRW)
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND'];
    if (noDecimalCurrencies.includes(currency)) {
      return Math.round(amount);
    }
    return Math.round(amount * 100) / 100;
  }

  generateCryptoAddress(currency) {
    // Mock address generation
    const prefixes = {
      BTC: '1',
      ETH: '0x',
      USDT: '0x',
      USDC: '0x',
    };
    const prefix = prefixes[currency] || '0x';
    return prefix + Math.random().toString(16).substr(2, 40);
  }

  generateQRCode(currency, amount) {
    // In production, generate actual QR code
    return `data:image/png;base64,mock_qr_code_data`;
  }
}

module.exports = new GlobalPaymentService();

