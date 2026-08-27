export type NotificationType = 'plan_published' | 'new_message' | 'workout_skipped' | 'new_pr';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
