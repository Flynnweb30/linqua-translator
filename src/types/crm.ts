export interface CRMCallRecord {
  id: string;
  leadName: string;
  company: string;
  phone: string;
  notes: string;
  dealSize: string;
  status: 'In Progress' | 'Qualified' | 'Follow Up' | 'Closed Won';
}

export const DEFAULT_CRM_RECORD: CRMCallRecord = {
  id: 'lead-8429',
  leadName: 'Carlos Mendoza',
  company: 'Soluciones Globales S.A.',
  phone: '+1 (555) 382-9014',
  notes: 'Interested in enterprise cloud deployment. Discussing pricing tiers, integration with existing SQL databases, and Spanish-speaking technical support SLA.',
  dealSize: '$48,000 / yr',
  status: 'In Progress',
};
