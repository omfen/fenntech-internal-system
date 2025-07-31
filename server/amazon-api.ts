import crypto from 'crypto';
import aws4 from 'aws4';

interface AmazonAPICredentials {
  accessKey: string;
  secretKey: string;
  associateTag: string;
  region: string;
}

interface ProductInfo {
  title: string;
  price: number;
  asin: string;
  currency: string;
}

export class AmazonProductAPI {
  private credentials: AmazonAPICredentials;
  private endpoint = 'webservices.amazon.com';
  private uri = '/paapi5/getitems';

  constructor(credentials: AmazonAPICredentials) {
    this.credentials = credentials;
  }

  /**
   * Get product information from Amazon Product Advertising API
   */
  async getProductInfo(asin: string): Promise<ProductInfo | null> {
    try {
      const requestBody = {
        ItemIds: [asin],
        Resources: [
          'ItemInfo.Title',
          'Offers.Listings.Price',
          'ItemInfo.ProductInfo'
        ],
        PartnerTag: this.credentials.associateTag,
        PartnerType: 'Associates',
        Marketplace: 'www.amazon.com'
      };

      const request = {
        host: this.endpoint,
        method: 'POST',
        url: `https://${this.endpoint}${this.uri}`,
        path: this.uri,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems'
        },
        body: JSON.stringify(requestBody)
      };

      // Sign the request using AWS4
      const signedRequest = aws4.sign(request, {
        accessKeyId: this.credentials.accessKey,
        secretAccessKey: this.credentials.secretKey
      });

      const response = await fetch(`https://${this.endpoint}${this.uri}`, {
        method: signedRequest.method,
        headers: signedRequest.headers as Record<string, string>,
        body: signedRequest.body
      });

      if (!response.ok) {
        console.error('Amazon API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return null;
      }

      const data = await response.json();
      
      if (data.Errors && data.Errors.length > 0) {
        console.error('Amazon API returned errors:', data.Errors);
        return null;
      }

      if (!data.ItemsResult || !data.ItemsResult.Items || data.ItemsResult.Items.length === 0) {
        console.log('No items found for ASIN:', asin);
        return null;
      }

      const item = data.ItemsResult.Items[0];
      
      // Extract title
      const title = item.ItemInfo?.Title?.DisplayValue || 'Unknown Product';
      
      // Extract price - try different price sources
      let price = 0;
      let currency = 'USD';
      
      if (item.Offers?.Listings && item.Offers.Listings.length > 0) {
        const listing = item.Offers.Listings[0];
        if (listing.Price?.Amount) {
          price = listing.Price.Amount;
          currency = listing.Price.Currency || 'USD';
        }
      }

      return {
        title,
        price,
        asin,
        currency
      };

    } catch (error) {
      console.error('Error fetching product from Amazon API:', error);
      return null;
    }
  }

  /**
   * Extract ASIN from Amazon URL
   */
  static extractASIN(url: string): string | null {
    const asinPatterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
      /asin=([A-Z0-9]{10})/i
    ];

    for (const pattern of asinPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}