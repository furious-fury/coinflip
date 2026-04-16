import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chain";

const rpc =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_RPC_URL
    ? process.env.NEXT_PUBLIC_RPC_URL
    : "https://testnet-rpc.monad.xyz";

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(rpc),
  },
  ssr: true,
});
