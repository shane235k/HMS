// apps/api/src/modules/payments/payment-provider.interface.ts
import { PaymentStatus, RefundStatus } from '@hbms/shared';

export interface CardDetails {
  cardNumber?: string;
  cardholderName?: string;
  expMonth?: number;
  expYear?: number;
  cvv?: string;
}

export interface ProcessPaymentParams {
  amountCents: number;
  currency: string;
  reservationId: string;
  idempotencyKey: string;
  paymentMethod: string;
  cardDetails?: CardDetails;
  simulateDecline?: boolean;
  simulateError?: boolean;
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionReference: string;
  status: PaymentStatus;
  errorMessage?: string;
  providerResponse?: Record<string, any>;
}

export interface ProcessRefundParams {
  paymentTransactionReference: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
  simulateFailure?: boolean;
}

export interface ProcessRefundResult {
  success: boolean;
  refundReference: string;
  status: RefundStatus;
  errorMessage?: string;
  providerResponse?: Record<string, any>;
}

export interface PaymentProvider {
  readonly name: string;
  processPayment(params: ProcessPaymentParams): Promise<ProcessPaymentResult>;
  processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult>;
}

