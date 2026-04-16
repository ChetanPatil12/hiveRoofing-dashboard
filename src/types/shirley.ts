export type TradeStatus = 'not_started' | 'scheduling' | 'scheduled' | 'in_progress' | 'completed';
export type AccessType = 'exterior' | 'interior';
export type AppointmentStatus = 'proposed' | 'confirmed' | 'cancelled' | 'completed';
export type AppointmentType = 'inspection' | 'estimate' | 'work';
export type MessageDirection = 'inbound' | 'outbound';
export type SenderType = 'shirley' | 'employee' | 'homeowner' | 'subcontractor';
export type MessageType =
  | 'scheduling_proposal'
  | 'confirmation'
  | 'reminder'
  | 'custom'
  | 'follow_up'
  | 'general'
  | 'escalation';
export type EscalationSeverity = 'low' | 'medium' | 'high';
export type JobStatus = 'scheduling' | 'on_track' | 'needs_attention';

export interface Subcontractor {
  sub_id: string;
  name: string;
  phone: string;
  language: string;
  trades_handled: string[];
  active_status: boolean;
  created_at: string;
}

export interface Trade {
  trade_id: string;
  job_id: string;
  trade_type: string;
  assigned_sub_id: string | null;
  status: TradeStatus;
  access_type: AccessType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  sub_name?: string;
  sub_phone?: string;
  sub_language?: string;
}

export interface Appointment {
  appointment_id: string;
  job_id: string;
  trade_id: string;
  sub_id: string;
  proposed_time: string | null;
  confirmed_time: string | null;
  appointment_type: AppointmentType;
  homeowner_confirmed: boolean;
  sub_confirmed: boolean;
  reminder_24hr_sent: boolean;
  reminder_morning_sent: boolean;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  message_id: string;
  job_id: string;
  trade_id: string | null;
  timestamp: string;
  direction: MessageDirection;
  sender_phone: string;
  recipient_phone: string;
  message_body: string;
  sender_type: SenderType;
  message_type: MessageType;
  ai_intent_classification: string | null;
  ai_confidence_score: number | null;
  state_change_triggered: boolean;
  state_change_details: Record<string, unknown> | null;
  created_at: string;
}

export interface Job {
  job_id: string;
  property_address: string;
  homeowner_name: string;
  homeowner_phone: string;
  language_preference: 'en' | 'es';
  current_status: string;
  acculynx_job_id: string | null;
  job_notes: string | null;
  created_at: string;
  updated_at: string;
  // joined / computed
  trades?: Trade[];
  last_message_at?: string | null;
  computed_status?: JobStatus;
  has_unresolved_escalation?: boolean;
}

export interface Escalation {
  escalation_id: string;
  job_id: string | null;
  trade_id: string | null;
  phone: string | null;
  message_body: string | null;
  reason: string | null;
  severity: EscalationSeverity;
  source: string | null;
  resolved_at: string | null;
  created_at: string;
  // joined
  property_address?: string | null;
  homeowner_name?: string | null;
}

// Escalation webhook payload from Shirley backend
export interface EscalationWebhookPayload {
  type: 'escalation';
  severity: EscalationSeverity;
  jobId: string | null;
  tradeId: string | null;
  phone: string;
  messageBody: string;
  reason: string;
  source: string;
  timestamp: string;
}

// Activation form payload
export interface ActivationTrade {
  tradeType: string;
  accessType: AccessType;
  appointmentType: AppointmentType;
  subId?: string; // DB sub_id if picked from existing subcontractor
  subcontractor: {
    name: string;
    phone: string;
    language: 'en' | 'es';
  };
  // Only for "Roofing - Replacement" trades
  supplier?: {
    name: string;
    phone: string;
  };
}

export interface ActivationPayload {
  acculynxJobId?: string;
  propertyAddress: string;
  homeowner: {
    name: string;
    phone: string;
    language: 'en' | 'es';
  };
  trades: ActivationTrade[];
  jobNotes?: string;
}

// Send message payload
export interface SendMessagePayload {
  jobId: string;
  recipientPhone: string;
  messageBody: string;
  employeeId: string;
  tradeId?: string;
}

// AccuLynx types for Shirley activation search
export interface AccuLynxJobResult {
  id: string;
  address: {
    fullAddress: string;
  };
  homeownerName?: string;
  tradeTypes?: Array<{ id: string; name: string }>;
  contactId?: string;
  phoneNumberId?: string;
}

export interface AccuLynxContactResult {
  firstName?: string;
  lastName?: string;
  phoneNumber?: Array<{ number: string }>;
}
