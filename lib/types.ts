export type Project = {
  id: string;
  name: string;
  webhook_url: string;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  name: string;
  webhookUrl: string;
};
