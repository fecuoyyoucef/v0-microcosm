export type QuestionType = "short_text" | "long_text" | "single_choice" | "multiple_choice"
export type QuestionnaireStatus = "draft" | "published" | "closed"

export interface QuestionnaireQuestion {
  id: string
  questionnaire_id: string
  question_text: string
  question_type: QuestionType
  options: string[]
  is_required: boolean
  position: number
  created_at: string
}

export interface Questionnaire {
  id: string
  group_id: string
  created_by: string
  title: string
  description: string | null
  status: QuestionnaireStatus
  anonymous: boolean
  allow_multiple_responses: boolean
  closes_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  questions?: QuestionnaireQuestion[]
  response_count?: number
  user_has_responded?: boolean
}

export interface QuestionnaireResponse {
  id: string
  questionnaire_id: string
  user_id: string
  submitted_at: string
}

export interface QuestionnaireAnswer {
  id: string
  response_id: string
  question_id: string
  answer_text: string | null
  selected_options: string[]
  created_at: string
}

/** Draft used by the editor before saving */
export interface QuestionDraft {
  id?: string
  question_text: string
  question_type: QuestionType
  options: string[]
  is_required: boolean
  position: number
}
