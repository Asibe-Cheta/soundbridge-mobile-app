export interface GigRating {
  id: string;
  project_id: string;          // opportunity_projects.id
  rater_id: string;
  ratee_id: string;
  overall_rating: number;           // 1-5 required
  professionalism_rating: number;   // 1-5 required
  punctuality_rating: number;       // 1-5 required
  quality_rating: number | null;    // 1-5 optional (poster rates creator)
  payment_promptness_rating: number | null; // 1-5 optional (creator rates poster)
  review_text: string | null;       // max 1000 chars
  created_at: string;
}

// GET /api/gig-ratings/project/:projectId response shape
export interface ProjectRatings {
  both_submitted: boolean;
  has_rated: boolean;
  my_rating: GigRating | null;
  their_rating: GigRating | null;
}

// GET /api/gig-ratings/user/:userId response shape
export interface UserRatingSummary {
  average_rating: number | null;
  total_reviews: number;
  ratings: GigRating[];
}
