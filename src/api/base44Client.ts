// Base44 Client Simulation for FratRank
// This simulates the Base44 API client with localStorage persistence

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  points: number;
  created_at: string;
}

interface EntityRecord {
  id: string;
  created_date: string;
  [key: string]: any;
}

type FilterOptions = Record<string, any>;

class EntityClient<T extends EntityRecord> {
  private storageKey: string;

  constructor(entityName: string) {
    this.storageKey = `fratrank_${entityName}`;
  }

  private getAll(): T[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  private saveAll(records: T[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(records));
  }

  async list(sortBy?: string): Promise<T[]> {
    let records = this.getAll();
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      records.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return desc ? bVal - aVal : aVal - bVal;
        }
        return desc 
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }
    return records;
  }

  async filter(filters: FilterOptions, sortBy?: string): Promise<T[]> {
    let records = this.getAll();
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        records = records.filter(r => r[key] === value);
      }
    }

    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      records.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return desc ? bVal - aVal : aVal - bVal;
        }
        return desc 
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }

    return records;
  }

  async get(id: string): Promise<T | null> {
    const records = this.getAll();
    return records.find(r => r.id === id) || null;
  }

  async create(data: Partial<T>): Promise<T> {
    const records = this.getAll();
    const newRecord: T = {
      ...data,
      id: crypto.randomUUID(),
      created_date: new Date().toISOString(),
    } as T;
    records.push(newRecord);
    this.saveAll(records);
    return newRecord;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = { ...records[index], ...data };
    this.saveAll(records);
    return records[index];
  }

  async delete(id: string): Promise<boolean> {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    records.splice(index, 1);
    this.saveAll(records);
    return true;
  }
}

class AuthClient {
  private storageKey = 'fratrank_user';

  async me(): Promise<User | null> {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  async updateMe(updates: Partial<User>): Promise<User | null> {
    const user = await this.me();
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(this.storageKey, JSON.stringify(updatedUser));
    return updatedUser;
  }

  redirectToLogin(redirectUrl: string): void {
    // Simulate login with a demo user
    const demoUser: User = {
      id: crypto.randomUUID(),
      email: 'student@duke.edu',
      name: 'Duke Student',
      avatar_url: undefined,
      points: 0,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(demoUser));
    window.location.href = redirectUrl;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}

class IntegrationsClient {
  Core = {
    async UploadFile({ file }: { file: File }): Promise<{ url: string }> {
      // Simulate file upload by creating a data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ url: reader.result as string });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
  };
}

// Entity types
export interface Campus {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  location: string;
  created_date: string;
}

export interface Fraternity {
  id: string;
  campus_id: string;
  name: string;
  chapter: string;
  description: string;
  logo_url: string;
  founded_year: number;
  base_score: number;
  reputation_score: number;
  historical_party_score: number;
  momentum: number;
  display_score: number;
  status: 'active' | 'inactive' | 'suspended';
  created_date: string;
}

export interface Party {
  id: string;
  fraternity_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  theme: string;
  tags: string[];
  display_photo_url: string;
  performance_score: number;
  quantifiable_score: number;
  unquantifiable_score: number;
  total_ratings: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  created_date: string;
}

export interface PartyRating {
  id: string;
  party_id: string;
  user_id: string;
  vibe_score: number;
  music_score: number;
  execution_score: number;
  party_quality_score: number;
  weight: number;
  created_date: string;
}

export interface PartyComment {
  id: string;
  party_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  text: string;
  sentiment_score: number;
  toxicity_label: 'safe' | 'toxic' | 'flagged';
  upvotes: number;
  moderated: boolean;
  created_date: string;
}

export interface FraternityComment {
  id: string;
  fraternity_id: string;
  user_id: string;
  parent_comment_id?: string | null;
  text: string;
  sentiment_score: number;
  toxicity_label: 'safe' | 'toxic' | 'flagged';
  upvotes: number;
  moderated: boolean;
  created_date: string;
}

export interface ReputationRating {
  id: string;
  fraternity_id: string;
  user_id: string;
  brotherhood_score: number;
  reputation_score: number;
  community_score: number;
  combined_score: number; // 0.30*brotherhood + 0.60*reputation + 0.10*community
  weight: number;
  semester: string;
  created_date: string;
}

export interface PartyPhoto {
  id: string;
  party_id: string;
  user_id: string;
  url: string;
  likes: number;
  dislikes: number;
  consent_verified: boolean;
  faces_detected: number;
  faces_blurred: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  caption: string;
  created_date: string;
}

export const base44 = {
  auth: new AuthClient(),
  entities: {
    Campus: new EntityClient<Campus>('campus'),
    Fraternity: new EntityClient<Fraternity>('fraternity'),
    Party: new EntityClient<Party>('party'),
    PartyRating: new EntityClient<PartyRating>('party_rating'),
    PartyComment: new EntityClient<PartyComment>('party_comment'),
    FraternityComment: new EntityClient<FraternityComment>('fraternity_comment'),
    ReputationRating: new EntityClient<ReputationRating>('reputation_rating'),
    PartyPhoto: new EntityClient<PartyPhoto>('party_photo'),
  },
  integrations: new IntegrationsClient(),
};

// Seed data function
export async function seedInitialData(): Promise<void> {
  const existingFrats = await base44.entities.Fraternity.list();
  if (existingFrats.length > 0) return;

  // Create campus
  const campus = await base44.entities.Campus.create({
    name: 'Duke University',
    domain: 'duke.edu',
    active: true,
    location: 'Durham, NC',
  });

  // Create fraternities - Full Duke IFC/NPHC list
  const frats = [
    { name: 'Kappa Alpha Psi', chapter: 'ΚΑΨ', description: 'Achievement in every field of human endeavor', founded_year: 1911 },
    { name: 'Sigma Chi', chapter: 'ΣΧ', description: 'Brotherhood of lifelong friends', founded_year: 1855 },
    { name: 'Alpha Epsilon Pi', chapter: 'ΑΕΠ', description: 'Developing leadership for the Jewish community', founded_year: 1913 },
    { name: 'Sigma Alpha Epsilon', chapter: 'ΣΑΕ', description: 'True Gentlemen', founded_year: 1856 },
    { name: 'Pi Kappa Phi', chapter: 'ΠΚΦ', description: 'Building better men through service', founded_year: 1904 },
    { name: 'Omega Psi Phi', chapter: 'ΩΨΦ', description: 'Manhood, scholarship, perseverance, and uplift', founded_year: 1911 },
    { name: 'Sigma Nu', chapter: 'ΣΝ', description: 'Love, honor, and truth', founded_year: 1869 },
    { name: 'Pi Kappa Alpha', chapter: 'ΠΚΑ', description: 'Once a Pike, always a Pike', founded_year: 1868 },
    { name: 'Alpha Tau Omega', chapter: 'ΑΤΩ', description: 'Building better men', founded_year: 1865 },
    { name: 'Kappa Alpha Order', chapter: 'ΚΑ', description: 'Dieu et les Dames', founded_year: 1865 },
    { name: 'Lambda Phi Epsilon', chapter: 'ΛΦΕ', description: 'Authentic leaders of the world', founded_year: 1981 },
    { name: 'Psi Upsilon', chapter: 'ΨΥ', description: 'Union of hearts and hands', founded_year: 1833 },
    { name: 'Lambda Upsilon Lambda', chapter: 'ΛΥΛ', description: 'Latino unity and academic excellence', founded_year: 1982 },
    { name: 'Delta Sigma Phi', chapter: 'ΔΣΦ', description: 'Better men, better lives', founded_year: 1899 },
    { name: 'Chi Psi', chapter: 'ΧΨ', description: 'Gentleman, scholar, jolly good fellow', founded_year: 1841 },
    { name: 'Alpha Delta Phi', chapter: 'ΑΔΦ', description: 'Mind, heart, character', founded_year: 1832 },
    { name: 'Sigma Pi', chapter: 'ΣΠ', description: 'Promote fellowship and scholarship', founded_year: 1897 },
    { name: 'Phi Delta Theta', chapter: 'ΦΔΘ', description: 'Becoming the greatest version of ourselves', founded_year: 1848 },
    { name: 'Sigma Phi Epsilon', chapter: 'ΣΦΕ', description: 'Building balanced men', founded_year: 1901 },
    { name: 'Delta Tau Delta', chapter: 'ΔΤΔ', description: 'Committed to lives of excellence', founded_year: 1858 },
    { name: 'Delta Sigma Iota', chapter: 'ΔΣΙ', description: 'Serving the South Asian community', founded_year: 1998 },
    { name: 'Phi Beta Sigma', chapter: 'ΦΒΣ', description: 'Culture for service and service for humanity', founded_year: 1914 },
    { name: 'Alpha Phi Alpha', chapter: 'ΑΦΑ', description: 'First and finest', founded_year: 1906 },
    { name: 'Delta Kappa Epsilon', chapter: 'ΔΚΕ', description: 'Friends from the heart forever', founded_year: 1844 },
  ];

  const createdFrats: Fraternity[] = [];
  for (const frat of frats) {
    const created = await base44.entities.Fraternity.create({
      campus_id: campus.id,
      ...frat,
      logo_url: '',
      base_score: 5 + Math.random() * 3,
      reputation_score: 5 + Math.random() * 3,
      historical_party_score: 5 + Math.random() * 3,
      momentum: (Math.random() - 0.5) * 2,
      display_score: 5 + Math.random() * 4,
      status: 'active',
    });
    createdFrats.push(created);
  }

  // Create parties
  const partyTitles = [
    'Margaritaville', 'Casino Night', 'Neon Nights', 'Beach Bash', 
    'Winter Formal', 'Spring Fling', 'Halloween Havoc', 'Tailgate Throwdown'
  ];

  const themes = ['casual', 'formal', 'themed', 'mixer'];
  const now = new Date();

  for (let i = 0; i < 8; i++) {
    const frat = createdFrats[i % createdFrats.length];
    const daysOffset = i < 3 ? -7 - i * 3 : i * 2;
    const startDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 5 * 60 * 60 * 1000);
    
    await base44.entities.Party.create({
      fraternity_id: frat.id,
      title: partyTitles[i],
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      venue: `${frat.name} House`,
      theme: themes[i % themes.length],
      tags: ['social', themes[i % themes.length]],
      display_photo_url: '',
      performance_score: daysOffset < 0 ? 6 + Math.random() * 3 : 0,
      quantifiable_score: daysOffset < 0 ? 6 + Math.random() * 3 : 0,
      unquantifiable_score: 5,
      total_ratings: daysOffset < 0 ? Math.floor(Math.random() * 20) + 5 : 0,
      status: daysOffset < -1 ? 'completed' : daysOffset <= 0 ? 'active' : 'upcoming',
    });
  }
}

export default base44;
