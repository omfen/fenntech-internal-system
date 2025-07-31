import jsPDF from 'jspdf';
import type { Quotation, Invoice, CompanySettings } from '@shared/schema';
import fennTechLogo from '@assets/FennTech ONLY_1753941339432.png';

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

    // Company details with better formatting
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    let yPos = 40;
    
    if (companySettings?.address) {
      // Split address into lines for better formatting
      const addressLines = companySettings.address.split(',').map(line => line.trim());
      addressLines.forEach(line => {
        this.pdf.text(line, 20, yPos);
        yPos += 5;
      });
    }
    
    if (companySettings?.email) {
      this.pdf.text(`Email: ${companySettings.email}`, 20, yPos);
      yPos += 5;
    }
    
    if (companySettings?.phone) {
      this.pdf.text(`Phone: ${companySettings.phone}`, 20, yPos);
      yPos += 5;
    }
    
    if (companySettings?.website) {
      this.pdf.text(`Website: ${companySettings.website}`, 20, yPos);
    }
  }

  generateQuotationPDF(quotation: Quotation, companySettings?: CompanySettings, clientName?: string): Uint8Array {
    this.pdf = new jsPDF();
    
    // Header
    this.addCompanyHeader(companySettings);
    
    // Add FennTech logo in bottom right
    try {
      // Add logo at bottom right (page width is 210mm, height is 297mm for A4)
      this.pdf.addImage(fennTechLogo, 'PNG', 160, 260, 30, 20);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
    
    // Document title - centered
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('QUOTATION', 20, 85);
    
    // Quote details - left side
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`Quote Number: ${quotation.quoteNumber}`, 20, 105);
    this.pdf.text(`Date: ${this.formatDate(quotation.quoteDate)}`, 20, 115);
    this.pdf.text(`Valid Until: ${this.formatDate(quotation.expirationDate)}`, 20, 125);
    this.pdf.text(`Status: ${quotation.status.toUpperCase()}`, 20, 135);
    
    // Client details - right side
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Bill To:', 120, 105);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(clientName || 'Client Name', 120, 115);
    
    // Line items table
    const startY = 155;
    let currentY = startY;
    
    // Draw table border
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(20, currentY - 5, 170, 15); // Table header
    
    // Table headers with better spacing
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(10);
    this.pdf.text('Description', 25, currentY);
    this.pdf.text('Qty', 120, currentY);
    this.pdf.text('Unit Price', 140, currentY);
    this.pdf.text('Total', 170, currentY);
    
    currentY += 10;
    
    // Line items with better formatting
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    
    const items = quotation.items as any[];
    items.forEach((item, index) => {
      // Draw row border
      this.pdf.rect(20, currentY - 5, 170, 10);
      
      // Truncate long descriptions
      const description = item.description.length > 40 ? 
        item.description.substring(0, 37) + '...' : item.description;
      
      this.pdf.text(description, 25, currentY);
      this.pdf.text(item.quantity.toString(), 125, currentY);
      this.pdf.text(this.formatCurrency(item.unitPrice, quotation.currency), 142, currentY);
      this.pdf.text(this.formatCurrency(item.total, quotation.currency), 172, currentY);
      currentY += 10;
    });
    
    // Totals section with better alignment
    currentY += 15;
    const totalsStartX = 140;
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    this.pdf.text('Subtotal:', totalsStartX, currentY);
    this.pdf.text(this.formatCurrency(quotation.subtotal, quotation.currency), totalsStartX + 35, currentY);
    
    currentY += 8;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total:', totalsStartX, currentY);
    this.pdf.text(this.formatCurrency(quotation.total, quotation.currency), totalsStartX + 35, currentY);
    
    // Notes section with better spacing
    if (quotation.notes) {
      currentY += 20;
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(11);
      this.pdf.text('Notes:', 20, currentY);
      currentY += 8;
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(9);
      
      // Split long notes into multiple lines
      const maxWidth = 170;
      const lines = this.pdf.splitTextToSize(quotation.notes, maxWidth);
      lines.forEach((line: string) => {
        this.pdf.text(line, 20, currentY);
        currentY += 5;
      });
    }
    
    // Professional footer
    const footerY = 270;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.text('This quotation is valid for 30 days from the date issued.', 20, footerY);
    this.pdf.text(`All prices are in ${quotation.currency} and subject to change without notice.`, 20, footerY + 5);
    this.pdf.text('Thank you for your business!', 20, footerY + 10);
    
    return new Uint8Array(this.pdf.output('arraybuffer'));
  }

  generateInvoicePDF(invoice: Invoice, companySettings?: CompanySettings, clientName?: string): Uint8Array {
    this.pdf = new jsPDF();
    
    // Header
    this.addCompanyHeader(companySettings);
    
    // Add FennTech logo in bottom right
    try {
      this.pdf.addImage(fennTechLogo, 'PNG', 160, 260, 30, 20);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
    
    // Document title
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('INVOICE', 20, 85);
    
    // Invoice details
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`Invoice Number: ${invoice.invoiceNumber}`, 20, 105);
    this.pdf.text(`Date: ${this.formatDate(invoice.invoiceDate)}`, 20, 115);
    this.pdf.text(`Due Date: ${this.formatDate(invoice.dueDate)}`, 20, 125);
    this.pdf.text(`Status: ${invoice.status.toUpperCase()}`, 20, 135);
    
    // Client details
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Bill To:', 120, 105);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(clientName || 'Client Name', 120, 115);
    
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
export const downloadQuotationPDF = (quotation: Quotation, companySettings?: CompanySettings, clientName?: string) => {
  const generator = new PDFGenerator();
  const pdfBytes = generator.generateQuotationPDF(quotation, companySettings, clientName);
  
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

export const downloadInvoicePDF = (invoice: Invoice, companySettings?: CompanySettings, clientName?: string) => {
  const generator = new PDFGenerator();
  const pdfBytes = generator.generateInvoicePDF(invoice, companySettings, clientName);
  
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