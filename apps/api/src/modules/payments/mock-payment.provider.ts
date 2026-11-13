// apps/api/src/modules/payments/mock-payment.provider.ts
import crypto from 'crypto';
import { PaymentStatus, RefundStatus } from '@hbms/shared';
import {
  PaymentProvider,
  ProcessPaymentParams,
  ProcessPaymentResult,
  ProcessRefundParams,
  ProcessRefundResult,
} from './payment-provider.interface';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK_PROVIDER';

  /**
   * Simulates processing a customer payment through an authoritative gateway.
   */
  async processPayment(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const transactionReference = `TXN-${dateStr}-${randomHex}`;

    // 1. Explicit simulation flags
    if (params.simulateDecline) {
      return {
        success: false,
        transactionReference,
        status: PaymentStatus.FAILED,
        errorMessage: 'Card declined by issuing bank: Insufficient funds or card restriction.',
        providerResponse: {
          declineCode: 'INSUFFICIENT_FUNDS',
          simulated: true,
        },
      };
    }

    if (params.simulateError) {
      return {
        success: false,
        transactionReference,
        status: PaymentStatus.FAILED,
        errorMessage: 'Payment gateway timeout or upstream network failure. Please retry.',
        providerResponse: {
          errorCode: 'GATEWAY_TIMEOUT',
          simulated: true,
        },
      };
    }

    // 2. Validate card number has valid length (>= 12 digits)
    if (params.cardDetails?.cardNumber) {
      const cleanDigits = params.cardDetails.cardNumber.replace(/\D/g, '');
      if (cleanDigits.length < 12) {
        return {
          success: false,
          transactionReference,
          status: PaymentStatus.FAILED,
          errorMessage: 'Invalid card number length: Minimum 12 digits required.',
          providerResponse: {
            declineCode: 'INVALID_NUMBER_LENGTH',
            simulated: true,
          },
        };
      }

      // Test suite card simulation patterns:
      // Ending in 0002 simulates insufficient funds
      if (cleanDigits.endsWith('0002')) {
        return {
          success: false,
          transactionReference,
          status: PaymentStatus.FAILED,
          errorMessage: 'Card declined: Insufficient funds on account.',
          providerResponse: {
            declineCode: 'INSUFFICIENT_FUNDS',
            simulated: true,
          },
        };
      }

      // Ending in 0003 simulates card network error
      if (cleanDigits.endsWith('0003')) {
        return {
          success: false,
          transactionReference,
          status: PaymentStatus.FAILED,
          errorMessage: 'Card declined: Network or terminal error.',
          providerResponse: {
            declineCode: 'NETWORK_ERROR',
            simulated: true,
          },
        };
      }
    }

    // 3. Successful charge: all valid lengthened cards pass all payment milestones
    return {
      success: true,
      transactionReference,
      status: PaymentStatus.SUCCESS,
      providerResponse: {
        authorized: true,
        authorizationCode: `AUTH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        currency: params.currency,
        amountCents: params.amountCents,
        paymentMethod: params.paymentMethod || 'MOCK_CARD',
      },
    };
  }

  /**
   * Simulates processing a refund through an authoritative gateway.
   */
  async processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const refundReference = `REF-${dateStr}-${randomHex}`;

    // Simulation for failed refund
    if (params.simulateFailure) {
      return {
        success: false,
        refundReference,
        status: RefundStatus.FAILED,
        errorMessage: 'Refund rejected by card network: Original card account is closed or flagged.',
        providerResponse: {
          declineCode: 'REFUND_REJECTED',
          simulated: true,
        },
      };
    }

    return {
      success: true,
      refundReference,
      status: RefundStatus.PROCESSED,
      providerResponse: {
        refunded: true,
        originalTransaction: params.paymentTransactionReference,
        amountCents: params.amountCents,
        currency: params.currency,
      },
    };
  }
}

export const defaultPaymentProvider: PaymentProvider = new MockPaymentProvider();

