export interface Plan {
  id: 'free' | 'premium' | 'unlimited';
  name: string;
  description: string;
  icon: string;
  price: { monthly: number; yearly: number };
  color: string;
  features: string[];
  popular: boolean;
  savings?: string;
  packageIds: {
    monthly: string;
    yearly: string;
  };
}

export const subscriptionPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    icon: 'flash',
    price: { monthly: 0, yearly: 0 },
    color: '#3B82F6',
    features: [
      '250MB storage (~30-40 tracks)',
      'Upload & sell music (keep 85%)',
      'Receive tips (keep 85%)',
      'Create & sell event tickets',
      'Unlimited event promotion',
      'Basic profile & networking',
      'Browse & discover music',
      'Basic analytics',
      'Community support',
    ],
    popular: false,
    packageIds: { monthly: '', yearly: '' },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For growing creators',
    icon: 'diamond',
    price: { monthly: 6.99, yearly: 69.99 },
    color: '#8B5CF6',
    features: [
      '2GB storage',
      'Unlimited track uploads',
      '85% creator share on tips and transactions',
      'Featured on Discover 1x per month',
      'Pro badge on profile',
      'Custom profile URL',
      'Advanced analytics',
      'Priority in feed',
      '60 second audio previews',
      'AI collaboration matching',
      'Priority support',
      'Early access to new features',
      'Headline Posts',
      'Audio snippet trimmer',
      'Event analytics dashboard',
      'AI Career Adviser — 10 analyses & 5 chat sessions/month (coming soon)',
    ],
    popular: true,
    savings: 'Save 16%',
    packageIds: {
      monthly: 'monthly',
      yearly: 'annual',
    },
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'For professionals',
    icon: 'rocket',
    price: { monthly: 12.99, yearly: 129.99 },
    color: '#F59E0B',
    features: [
      '10GB storage',
      'Unlimited track uploads',
      '90% creator share on tips and transactions',
      'Unlimited badge on profile',
      'Featured on Discover 2x per month',
      'Top priority in feed',
      'All Premium features',
      'Advanced event analytics with city and timing breakdown',
      'Audience intelligence dashboard',
      'Custom promo codes',
      'Email list export',
      'AI Career Adviser — 20 analyses & 15 chat sessions/month (coming soon)',
      'Highest priority support',
    ],
    popular: false,
    savings: 'Save 17%',
    packageIds: {
      monthly: '$rc_monthly',
      yearly: '$rc_annual',
    },
  },
];
