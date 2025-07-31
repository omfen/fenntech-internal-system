import jsPDF from 'jspdf';
import type { Quotation, Invoice, CompanySettings } from '@shared/schema';

export class PDFGenerator {
  private pdf: jsPDF;
  
  constructor() {
    this.pdf = new jsPDF();
  }

  private formatCurrency(amount: string | number, currency: string = 'JMD'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private addCompanyHeader(companySettings?: CompanySettings): void {
    // Company name
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(companySettings?.name || 'FennTech', 20, 30);

    // Company details
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    const yStart = 40;
    if (companySettings?.address) {
      this.pdf.text(companySettings.address, 20, yStart);
    }
    if (companySettings?.phone) {
      this.pdf.text(`Phone: ${companySettings.phone}`, 20, yStart + 6);
    }
    if (companySettings?.email) {
      this.pdf.text(`Email: ${companySettings.email}`, 20, yStart + 12);
    }
    if (companySettings?.website) {
      this.pdf.text(`Website: ${companySettings.website}`, 20, yStart + 18);
    }
  }

  generateQuotationPDF(quotation: Quotation, companySettings?: CompanySettings): Uint8Array {
    this.pdf = new jsPDF();
    
    // Header
    this.addCompanyHeader(companySettings);
    
    // Document title
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('QUOTATION', 20, 80);
    
    // Quote details
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`Quote Number: ${quotation.quoteNumber}`, 20, 95);
    this.pdf.text(`Date: ${this.formatDate(quotation.quoteDate)}`, 20, 105);
    this.pdf.text(`Valid Until: ${this.formatDate(quotation.expirationDate)}`, 20, 115);
    this.pdf.text(`Status: ${quotation.status.toUpperCase()}`, 20, 125);
    
    // Client details (you may need to pass client data)
    this.pdf.text('Bill To:', 120, 95);
    this.pdf.text('Client Name', 120, 105);
    
    // Line items table
    const startY = 140;
    let currentY = startY;
    
    // Table headers
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Description', 20, currentY);
    this.pdf.text('Qty', 120, currentY);
    this.pdf.text('Unit Price', 140, currentY);
    this.pdf.text('Total', 170, currentY);
    
    // Draw line under headers
    this.pdf.line(20, currentY + 3, 190, currentY + 3);
    currentY += 10;
    
    // Line items
    this.pdf.setFont('helvetica', 'normal');
    const items = Array.isArray(quotation.items) ? quotation.items : [];
    
    items.forEach((item: any) => {
      this.pdf.text(item.description.substring(0, 50), 20, currentY);
      this.pdf.text(item.quantity.toString(), 120, currentY);
      this.pdf.text(this.formatCurrency(item.unitPrice, quotation.currency), 140, currentY);
      this.pdf.text(this.formatCurrency(item.total, quotation.currency), 170, currentY);
      currentY += 8;
    });
    
    // Totals
    currentY += 10;
    this.pdf.line(120, currentY, 190, currentY);
    currentY += 8;
    
    this.pdf.text('Subtotal:', 120, currentY);
    this.pdf.text(this.formatCurrency(quotation.subtotal, quotation.currency), 170, currentY);
    currentY += 8;
    
    if (parseFloat(quotation.discountAmount || '0') > 0) {
      this.pdf.text('Discount:', 120, currentY);
      this.pdf.text(`-${this.formatCurrency(quotation.discountAmount || '0', quotation.currency)}`, 170, currentY);
      currentY += 8;
    }
    
    if (parseFloat(quotation.gctAmount || '0') > 0) {
      this.pdf.text('GCT (15%):', 120, currentY);
      this.pdf.text(this.formatCurrency(quotation.gctAmount || '0', quotation.currency), 170, currentY);
      currentY += 8;
    }
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total:', 120, currentY);
    this.pdf.text(this.formatCurrency(quotation.total, quotation.currency), 170, currentY);
    
    // Notes
    if (quotation.notes) {
      currentY += 20;
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Notes:', 20, currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(quotation.notes, 20, currentY + 8);
    }
    
    // Terms and conditions
    currentY += 30;
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('This quotation is valid for 30 days from the date issued.', 20, currentY);
    this.pdf.text('All prices are in ' + quotation.currency + ' and subject to change without notice.', 20, currentY + 6);
    
    return this.pdf.output('arraybuffer') as Uint8Array;
  }

  generateInvoicePDF(invoice: Invoice, companySettings?: CompanySettings): Uint8Array {
    this.pdf = new jsPDF();
    
    // Header
    this.addCompanyHeader(companySettings);
    
    // Document title
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('INVOICE', 20, 80);
    
    // Invoice details
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 95);
    this.pdf.text(`Date: ${this.formatDate(invoice.invoiceDate)}`, 20, 105);
    this.pdf.text(`Due Date: ${this.formatDate(invoice.dueDate)}`, 20, 115);
    this.pdf.text(`Status: ${invoice.status.toUpperCase()}`, 20, 125);
    
    // Client details
    this.pdf.text('Bill To:', 120, 95);
    this.pdf.text('Client Name', 120, 105);
    
    // Line items table (similar structure to quotation)
    const startY = 140;
    let currentY = startY;
    
    // Table headers
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Description', 20, currentY);
    this.pdf.text('Qty', 120, currentY);
    this.pdf.text('Unit Price', 140, currentY);
    this.pdf.text('Total', 170, currentY);
    
    // Draw line under headers
    this.pdf.line(20, currentY + 3, 190, currentY + 3);
    currentY += 10;
    
    // Line items
    this.pdf.setFont('helvetica', 'normal');
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    
    items.forEach((item: any) => {
      this.pdf.text(item.description.substring(0, 50), 20, currentY);
      this.pdf.text(item.quantity.toString(), 120, currentY);
      this.pdf.text(this.formatCurrency(item.unitPrice, invoice.currency), 140, currentY);
      this.pdf.text(this.formatCurrency(item.total, invoice.currency), 170, currentY);
      currentY += 8;
    });
    
    // Totals
    currentY += 10;
    this.pdf.line(120, currentY, 190, currentY);
    currentY += 8;
    
    this.pdf.text('Subtotal:', 120, currentY);
    this.pdf.text(this.formatCurrency(invoice.subtotal, invoice.currency), 170, currentY);
    currentY += 8;
    
    if (parseFloat(invoice.discountAmount || '0') > 0) {
      this.pdf.text('Discount:', 120, currentY);
      this.pdf.text(`-${this.formatCurrency(invoice.discountAmount || '0', invoice.currency)}`, 170, currentY);
      currentY += 8;
    }
    
    if (parseFloat(invoice.gctAmount || '0') > 0) {
      this.pdf.text('GCT (15%):', 120, currentY);
      this.pdf.text(this.formatCurrency(invoice.gctAmount || '0', invoice.currency), 170, currentY);
      currentY += 8;
    }
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total:', 120, currentY);
    this.pdf.text(this.formatCurrency(invoice.total, invoice.currency), 170, currentY);
    
    // Payment terms
    currentY += 20;
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Payment is due within 30 days of invoice date.', 20, currentY);
    this.pdf.text('Late payments may be subject to interest charges.', 20, currentY + 6);
    
    return this.pdf.output('arraybuffer') as Uint8Array;
  }
}

// Utility functions for downloading PDFs
export const downloadQuotationPDF = (quotation: Quotation, companySettings?: CompanySettings) => {
  const generator = new PDFGenerator();
  const pdfBytes = generator.generateQuotationPDF(quotation, companySettings);
  
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quotation-${quotation.quoteNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadInvoicePDF = (invoice: Invoice, companySettings?: CompanySettings) => {
  const generator = new PDFGenerator();
  const pdfBytes = generator.generateInvoicePDF(invoice, companySettings);
  
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoice.invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};