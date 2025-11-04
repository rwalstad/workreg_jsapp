// app/components/placeholderDefinitions.ts
// Central location for defining all available placeholders

export interface PlaceholderDefinition {
    placeholder: string;
    description: string;  // Human-readable description of what this placeholder represents
  }

  // All available placeholders for message templates
  export const availablePlaceholders: PlaceholderDefinition[] = [
    {
      placeholder: '[first_name]',
      description: 'The lead\'s first name'
    },
    {
      placeholder: '[last_name]',
      description: 'The lead\'s last name'
    },
    {
      placeholder: '[followup_date]',
      description: 'The date scheduled for follow-up contact'
    },
    {
      placeholder: '[company_name]',
      description: 'The lead\'s company name'
    },
    {
      placeholder: '[facebookgroup_name]',
      description: 'Name of the associated Facebook group'
    },
    {
      placeholder: '[job_title]',
      description: 'The lead\'s job title or position'
    },
    {
      placeholder: '[affiliate_link]',
      description: 'Your affiliate link'
    },
    {
      placeholder: '[affiliate_link_demo]',
      description: 'Your affiliate demo link'
    }
  ];

  // Helper function to check if a placeholder is valid
  export function isValidPlaceholder(text: string): boolean {
    return availablePlaceholders.some(p =>
      p.placeholder.toLowerCase() === text.toLowerCase()
    );
  }

  // Helper function to get a placeholder's description
  export function getPlaceholderDescription(placeholder: string): string {
    const found = availablePlaceholders.find(p =>
      p.placeholder.toLowerCase() === placeholder.toLowerCase()
    );
    return found ? found.description : 'Unknown placeholder';
  }