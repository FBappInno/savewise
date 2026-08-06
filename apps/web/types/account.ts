export type AccountSummary = {
  username: string;
  email: string;
};

export type AccountSession = {
  token: string;
  account: AccountSummary;
};

export type AccountStatus =
  | "loading"
  | "authenticated"
  | "anonymous";
