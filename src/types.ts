export interface LatLng {
  lat: number;
  lng: number;
}

export interface UserProfile {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  location?: LatLng;
  zone?: string;
  credibility_score: number;
  total_issues_reported: number;
  badges_earned: string[];
  is_authority?: boolean;
  created_at: string;
}

export interface Issue {
  issue_id: string;
  title: string;
  description: string;
  image_urls: string[];
  location: LatLng;
  category: string;
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'reported' | 'verifying' | 'verified' | 'investigating' | 'resolving' | 'resolved' | 'dismissed';
  department: string;
  assigned_to_person?: string;
  created_by: string;
  created_by_name?: string;
  upvotes: number;
  downvotes: number;
  verification_percentage: number;
  escalation_level: number;
  created_at: string;
  agent_actions?: {
    agent: string;
    action: string;
    timestamp: string;
    output: any;
  }[];
  is_duplicate_of?: string;
}

export interface Comment {
  comment_id: string;
  issue_id: string;
  author_id: string;
  author_name: string;
  text: string;
  upvotes: number;
  created_at: string;
}

export interface Badge {
  badge_id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  description: string;
  earned_at: string;
}

export interface Department {
  department_id: string;
  name: string;
  color: string;
  contact_email: string;
  resolution_rate: number;
  avg_response_time_hours: number;
}

export interface Verification {
  verification_id: string;
  issue_id: string;
  user_id: string;
  status: 'confirm' | 'reject';
  comments?: string;
  created_at: string;
}
