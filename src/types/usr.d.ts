export interface USR {
  applicant: Applicant;
  project: Project;
  team: TeamMember[];
  budget: Budget;
}

export interface Applicant {
  type: "individual" | "organization";
  name: Name;
  representative: Representative;
  address: Address;
  contact: Contact;
  sns: SNS;
  profile: Profile;
}

export interface Name {
  kanji: string;
  kana: string;
}

export interface Representative {
  name: Name;
  stage_name?: string;
}

export interface Address {
  postal_code: string;
  text: string;
}

export interface Contact {
  phone: string;
  email: string;
}

export interface SNS {
  website?: string;
  x_twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

export interface Profile {
  philosophy: string; // 活動方針や理念
  track_record: string; // 実績
}

export interface Project {
  title: Name; // kanji, kana
  category: string[];
  schedule: Schedule;
  venue: Venue;
  description: ProjectDescription;
  metrics: ProjectMetrics;
}

export interface Schedule {
  presentation_period: string;
  workshop_period: string;
  detailed_timeline: string;
}

export interface Venue {
  name: string;
  address?: string;
  contingency_plan?: string;
}

export interface ProjectDescription {
  summary: string;
  purpose: string;
  motivation: string;
  community_engagement: string;
  url?: string;
}

export interface ProjectMetrics {
  participants: string;
  impact: string;
  future_plans: string;
}

export interface TeamMember {
  name: string;
  role: string;
  affiliation?: string;
  tasks?: string;
}

export interface Budget {
  income: BudgetItem[];
  expense: BudgetItem[];
  total_income: number;
  total_expense: number;
  request_amount: number;
}

export interface BudgetItem {
  item: string;
  detail: string;
  amount: number;
}
