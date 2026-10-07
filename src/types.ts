/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Book {
  id: string;
  title: string;
  price: number;
  notes: string;
  meetupInfo: string;
  seller?: string;
  sellerContact?: string;
  category?: string;
  status: 'available' | 'reserved' | 'sold';
  createdAt?: string;
}

export interface PurchaseRequest {
  bookId: string;
  bookTitle: string;
  buyerName: string;
  buyerContact: string;
  tradeTime: string;
  note?: string;
}

export const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycbyf6yKHuDjp65iXY1etKYrixzbw94BVIgn2DzUNUDqieBgL4eEh_eg0Kn5PTQGTeWY/exec';
