export const COOKIE_SESSION = "coinflip_session";
export const COOKIE_LOGIN_NONCE = "coinflip_login_nonce";

/** Default 0.01 MON — override with MIN_DEPOSIT_WEI (wei) for production. */
export function minDepositWei(): bigint {
  const v = process.env.MIN_DEPOSIT_WEI ?? "10000000000000000";
  return BigInt(v);
}

/** Default 0.001 MON per session — override with MIN_STAKE_WEI (wei). */
export function minStakeWei(): bigint {
  const v = process.env.MIN_STAKE_WEI ?? "1000000000000000";
  return BigInt(v);
}

export function depositConfirmations(): bigint {
  return BigInt(process.env.DEPOSIT_CONFIRMATIONS ?? "1");
}
