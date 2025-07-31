// AI-powered contextual help service
interface HelpRequest {
  context: string;
  element?: string;
  userAgent?: string;
  timestamp?: string;
}

interface HelpResponse {
  explanation: string;
  tips?: string[];
  relatedFeatures?: string[];
}

// Knowledge base for FennTech system help content
const helpKnowledgeBase: Record<string, Record<string, HelpResponse>> = {
  // Dashboard help
  "page-dashboard": {
    "overview": {
      explanation: "The dashboard provides a comprehensive overview of your business operations, including pricing statistics, customer interactions, and recent activity across all modules.",
      tips: [
        "Check the dashboard regularly for important notifications",
        "Use the quick stats to monitor business performance",
        "Recent activity helps track what's happening in real-time"
      ],
      relatedFeatures: ["Pricing Sessions", "Customer Management", "Reports"]
    },
    "pricing-stats": {
      explanation: "Pricing statistics show your recent Intcomex and Amazon pricing activity, including total sessions, average values, and trends over time.",
      tips: [
        "Monitor pricing trends to optimize markup strategies",
        "Compare Intcomex vs Amazon pricing performance",
        "Use historical data for business planning"
      ],
      relatedFeatures: ["Intcomex Pricing", "Amazon Pricing", "Category Management"]
    },
    "customer-stats": {
      explanation: "Customer statistics display current status of inquiries, quotations, work orders, and tickets, helping you manage customer relationships effectively.",
      tips: [
        "Keep track of pending items that need attention",
        "Monitor completion rates for performance insights",
        "Use status indicators to prioritize urgent items"
      ],
      relatedFeatures: ["Customer Inquiries", "Work Orders", "Tickets", "Call Logs"]
    }
  },

  // Pricing help
  "page-intcomex-pricing": {
    "upload": {
      explanation: "Upload PDF invoices from Intcomex to automatically extract product information and calculate pricing with appropriate markups and GCT.",
      tips: [
        "Ensure PDF is clear and readable for best extraction",
        "Review extracted items before finalizing calculations",
        "Check category assignments for accuracy"
      ],
      relatedFeatures: ["Category Management", "Exchange Rate", "Email Reports"]
    },
    "categories": {
      explanation: "Product categories determine markup percentages. Items are automatically categorized based on keywords, but you can adjust them manually.",
      tips: [
        "Verify automatic categorization is correct",
        "Adjust markup percentages in Category Management",
        "Use consistent categorization for accurate pricing"
      ],
      relatedFeatures: ["Category Management", "Markup Percentages", "Pricing History"]
    },
    "calculations": {
      explanation: "Pricing follows the formula: (Cost USD × Exchange Rate) + 15% GCT, then apply category markup percentage. Final prices can be rounded.",
      tips: [
        "15% GCT is automatically added to all calculations",
        "Exchange rate is currently set to 162 JMD per USD",
        "Choose appropriate rounding option for your market"
      ],
      relatedFeatures: ["Exchange Rate Management", "Category Markups", "GCT Calculation"]
    }
  },

  "page-amazon-pricing": {
    "url-validation": {
      explanation: "Enter valid Amazon.com product URLs to extract pricing information. The system validates URLs and attempts to extract product details automatically.",
      tips: [
        "Use full Amazon product URLs for best results",
        "Manual cost entry is available if extraction fails",
        "Consider shipping weight and local taxes in final pricing"
      ],
      relatedFeatures: ["Manual Price Entry", "Markup Calculation", "Weight Warnings"]
    },
    "markup-logic": {
      explanation: "Amazon pricing uses dynamic markup: 80% for items under $100 USD, 120% for items over $100 USD. Cost is calculated as Amazon price + 7%.",
      tips: [
        "Markup percentages are automatically applied based on cost",
        "Factor in shipping costs and local taxes",
        "Review final prices before confirming orders"
      ],
      relatedFeatures: ["Cost Calculation", "Dynamic Markup", "Price History"]
    }
  },

  // Customer management help
  "page-customer-inquiries": {
    "status-management": {
      explanation: "Track customer inquiries through different statuses: New, Contacted, Follow-up, Completed, or Closed. Status history is automatically maintained.",
      tips: [
        "Update status as you progress with customer communications",
        "Assign inquiries to team members for better organization",
        "Use follow-up status for items requiring additional contact"
      ],
      relatedFeatures: ["Status History", "User Assignment", "Customer Communications"]
    },
    "assignment": {
      explanation: "Assign inquiries to specific team members to ensure proper follow-up and accountability. Only administrators can reassign items.",
      tips: [
        "Assign inquiries based on expertise and workload",
        "Track who is handling each customer interaction",
        "Use assignments for performance monitoring"
      ],
      relatedFeatures: ["User Management", "Status Tracking", "Team Coordination"]
    }
  },

  "page-quotation-requests": {
    "urgency-levels": {
      explanation: "Prioritize quotation requests using urgency levels: Low, Medium, High, or Urgent. This helps manage workload and customer expectations.",
      tips: [
        "Set urgency based on customer needs and deadlines",
        "High and urgent requests should be handled first",
        "Use urgency levels for workload planning"
      ],
      relatedFeatures: ["Priority Management", "Status Tracking", "Customer Communications"]
    },
    "status-workflow": {
      explanation: "Quotation requests flow through statuses: Pending, In Progress, Quoted, Accepted, Declined, or Completed with full history tracking.",
      tips: [
        "Update status as quotations progress through stages",
        "Use 'Quoted' status when prices are sent to customer",
        "Track acceptance/decline rates for business insights"
      ],
      relatedFeatures: ["Quote Generation", "Customer Follow-up", "Business Analytics"]
    }
  },

  "page-work-orders": {
    "status-workflow": {
      explanation: "Work orders follow a 5-stage workflow: Received → In Progress → Testing → Ready for Pickup → Completed. Customers receive email notifications at each stage.",
      tips: [
        "Update status as work progresses to keep customers informed",
        "Add detailed notes at each stage for documentation",
        "Email notifications are sent automatically on status changes"
      ],
      relatedFeatures: ["Status Notifications", "Email System", "Customer Communications"]
    },
    "notes-system": {
      explanation: "Technician notes provide detailed documentation of work performed, issues found, and solutions implemented throughout the repair process.",
      tips: [
        "Document all work performed for future reference",
        "Include part numbers and technical details",
        "Update notes regularly during the repair process"
      ],
      relatedFeatures: ["Documentation", "Quality Control", "Customer Service"]
    },
    "email-notifications": {
      explanation: "Professional email notifications are automatically sent to customers when work order status changes, keeping them informed of progress.",
      tips: [
        "Emails include work order details and next steps",
        "Professional templates maintain brand consistency",
        "Customers appreciate proactive communication"
      ],
      relatedFeatures: ["Customer Service", "Brand Management", "Communication"]
    }
  },

  "page-call-logs": {
    "call-tracking": {
      explanation: "Log incoming and outgoing customer calls with details about purpose, duration, outcome, and follow-up requirements for complete customer interaction history.",
      tips: [
        "Log calls immediately after completion for accuracy",
        "Include detailed notes about customer concerns",
        "Set follow-up dates for items requiring additional contact"
      ],
      relatedFeatures: ["Customer History", "Follow-up Management", "Service Quality"]
    },
    "call-outcomes": {
      explanation: "Track call outcomes to measure service effectiveness: Answered, Voicemail, Busy, No Answer, Resolved, or Follow-up Needed.",
      tips: [
        "Use consistent outcome categories for reporting",
        "Schedule follow-ups for unresolved items",
        "Track resolution rates for performance metrics"
      ],
      relatedFeatures: ["Service Metrics", "Follow-up Scheduling", "Performance Tracking"]
    }
  },

  "page-tickets": {
    "priority-system": {
      explanation: "Internal tickets use priority levels (Low, Medium, High, Urgent) to help teams focus on the most important issues first.",
      tips: [
        "Set priority based on business impact and urgency",
        "Urgent tickets should be addressed immediately",
        "Use priority for resource allocation and planning"
      ],
      relatedFeatures: ["Issue Management", "Team Coordination", "Resource Planning"]
    },
    "assignment": {
      explanation: "Assign tickets to specific team members based on expertise and availability. Track progress and ensure accountability.",
      tips: [
        "Assign based on technical expertise and workload",
        "Monitor ticket resolution times for performance",
        "Use assignments for skills development tracking"
      ],
      relatedFeatures: ["Team Management", "Skills Tracking", "Performance Monitoring"]
    }
  },

  // Form help
  "form-customer-inquiry": {
    "customer-name": {
      explanation: "Enter the full name of the customer making the inquiry. This helps with identification and follow-up communications.",
      tips: [
        "Use the customer's preferred name format",
        "Include both first and last names when possible",
        "Verify spelling for accurate records"
      ],
      relatedFeatures: ["Customer Database", "Communication Records"]
    },
    "telephone-number": {
      explanation: "Record the customer's primary contact number in a consistent format for easy callback and reference.",
      tips: [
        "Include area code for local numbers",
        "Use consistent formatting (e.g., 876-555-1234)",
        "Verify number accuracy with customer"
      ],
      relatedFeatures: ["Contact Management", "Call Logs"]
    },
    "item-inquiry": {
      explanation: "Describe the specific product or service the customer is asking about. Include as much detail as possible for accurate assistance.",
      tips: [
        "Include model numbers, brands, or specifications",
        "Note any specific features or requirements",
        "Ask clarifying questions if details are unclear"
      ],
      relatedFeatures: ["Product Database", "Inventory Management"]
    }
  },

  "form-work-order": {
    "item-description": {
      explanation: "Provide a detailed description of the item brought in for service, including make, model, and any identifying features.",
      tips: [
        "Include serial numbers when available",
        "Note physical condition and appearance",
        "Document any accessories or attachments"
      ],
      relatedFeatures: ["Inventory Tracking", "Service Documentation"]
    },
    "issue-description": {
      explanation: "Document the customer's description of the problem or issue with their item. This guides the diagnostic and repair process.",
      tips: [
        "Record the customer's exact words when possible",
        "Ask about when the problem started",
        "Note any error messages or symptoms"
      ],
      relatedFeatures: ["Diagnostic Process", "Repair Documentation"]
    }
  }
};

export class HelpService {
  static async generateHelp(request: HelpRequest): Promise<HelpResponse> {
    const { context, element } = request;
    
    // Check knowledge base first
    const contextHelp = helpKnowledgeBase[context];
    if (contextHelp && element && contextHelp[element]) {
      return contextHelp[context];
    }

    // Fallback to general context help
    if (contextHelp && contextHelp["general"]) {
      return contextHelp["general"];
    }

    // Generate contextual help based on the request
    return this.generateContextualHelp(context, element);
  }

  private static generateContextualHelp(context: string, element?: string): HelpResponse {
    // Parse context to understand what the user needs help with
    const contextParts = context.split('-');
    const mainContext = contextParts[0];
    const subContext = contextParts[1];

    // Generate help based on context patterns
    switch (mainContext) {
      case 'page':
        return this.generatePageHelp(subContext, element);
      case 'form':
        return this.generateFormHelp(subContext, element);
      case 'button':
        return this.generateButtonHelp(subContext, element);
      case 'feature':
        return this.generateFeatureHelp(subContext, element);
      default:
        return this.generateDefaultHelp(context, element);
    }
  }

  private static generatePageHelp(page: string, element?: string): HelpResponse {
    const pageHelp: Record<string, HelpResponse> = {
      dashboard: {
        explanation: "The dashboard shows an overview of your business operations with key metrics and recent activity.",
        tips: ["Use the dashboard to monitor daily operations", "Check for urgent items requiring attention"],
        relatedFeatures: ["Reports", "Analytics", "Notifications"]
      },
      pricing: {
        explanation: "The pricing module helps you calculate competitive prices for products with appropriate markups.",
        tips: ["Review calculations before finalizing prices", "Consider market conditions when setting markups"],
        relatedFeatures: ["Exchange Rates", "Categories", "History"]
      }
    };

    return pageHelp[page] || this.generateDefaultHelp(`page-${page}`, element);
  }

  private static generateFormHelp(form: string, field?: string): HelpResponse {
    const fieldHelp: Record<string, HelpResponse> = {
      email: {
        explanation: "Enter a valid email address that will be used for communications and notifications.",
        tips: ["Use your primary business email", "Ensure the email is regularly monitored"],
        relatedFeatures: ["Notifications", "Communications"]
      },
      phone: {
        explanation: "Provide a contact phone number for direct communication when needed.",
        tips: ["Include area code", "Use your primary business number"],
        relatedFeatures: ["Call Logs", "Customer Service"]
      }
    };

    return fieldHelp[field || 'general'] || {
      explanation: `This field is part of the ${form} form and is used to collect important information.`,
      tips: ["Fill out all required fields accurately", "Review your entries before submitting"],
      relatedFeatures: ["Data Management", "Form Validation"]
    };
  }

  private static generateButtonHelp(button: string, action?: string): HelpResponse {
    return {
      explanation: `This button performs the ${action || button} action. Click to execute the operation.`,
      tips: ["Ensure all required information is entered before clicking", "Review your data for accuracy"],
      relatedFeatures: ["Form Validation", "Data Processing"]
    };
  }

  private static generateFeatureHelp(feature: string, aspect?: string): HelpResponse {
    return {
      explanation: `The ${feature} feature provides functionality for ${aspect || 'managing related operations'}.`,
      tips: ["Explore different options available", "Refer to documentation for advanced features"],
      relatedFeatures: ["Related Tools", "Advanced Options"]
    };
  }

  private static generateDefaultHelp(context: string, element?: string): HelpResponse {
    return {
      explanation: `This section provides functionality for ${context.replace('-', ' ')}${element ? ` specifically for ${element}` : ''}.`,
      tips: [
        "Explore the available options and features",
        "Contact support if you need additional assistance"
      ],
      relatedFeatures: ["Documentation", "Support"]
    };
  }
}