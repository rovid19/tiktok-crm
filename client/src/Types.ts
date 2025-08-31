export interface Account {
  id: string;
  email: string;
  password: string;
  proxy: string;
  chrome_profile_path: string;
  status: "running" | "not running" | "cookies expired" | "curl failed";
  created_at: string;
  last_run: string;
  is_validated: boolean;
  curl_cmd: string;
}

export interface AccountFormData {
  email: string;
  password: string;
  proxy: string;
  curl_cmd: string;
}
