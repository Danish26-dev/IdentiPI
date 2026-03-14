const getLaceProvider = () => {
  if (typeof window === "undefined") return null;

  const cardano = window?.cardano || {};
  const knownKeys = ["lace", "laceMidnight", "midnight", "lace_preview", "lacePreview"];

  for (const key of knownKeys) {
    if (cardano[key] && typeof cardano[key].enable === "function") {
      return cardano[key];
    }
  }

  const dynamicProvider = Object.values(cardano).find(
    (provider) => provider && typeof provider.enable === "function",
  );

  return dynamicProvider || null;
};

export const connectLaceWallet = async () => {
  const provider = getLaceProvider();
  if (!provider) {
    throw new Error("Lace wallet extension not detected");
  }

  const api = await provider.enable();

  let walletAddress = null;
  const usedAddresses = await api.getUsedAddresses();
  if (Array.isArray(usedAddresses) && usedAddresses.length > 0) {
    walletAddress = usedAddresses[0];
  }

  if (!walletAddress) {
    walletAddress = await api.getChangeAddress();
  }

  const networkId = await api.getNetworkId();

  return {
    api,
    walletAddress,
    networkId,
  };
};

export const signWalletNonce = async ({ api, walletAddress, nonce }) => {
  if (!api || typeof api.signData !== "function") {
    throw new Error("Wallet does not support signing");
  }

  if (!walletAddress || !nonce) {
    throw new Error("Wallet address and nonce are required for signing");
  }

  return api.signData(walletAddress, nonce);
};
