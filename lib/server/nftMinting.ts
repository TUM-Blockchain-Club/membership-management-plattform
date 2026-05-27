import { Contract, JsonRpcProvider, Wallet, parseUnits } from "ethers"
import { tbcMembershipNftAbi } from "@/lib/contracts/tbcMembershipNftAbi"
import { getContractEnv, getRequiredContractEnv } from "./contractEnv"

const DEFAULT_MINT_GAS_LIMIT = BigInt(600_000)

export type MintMembershipInput = {
  recipientWallet: string
  displayName: string
  department: string
  imageUri: string
  funFacts: string
}

export const sanitizeMintImageUri = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""

  try {
    const url = new URL(trimmed)
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return trimmed.split("?")[0] || trimmed
  }
}

const buildFeeOverrides = () => {
  const maxPriorityFeeGwei = getContractEnv("MAX_PRIORITY_FEE_GWEI")
  const maxFeeGwei = getContractEnv("MAX_FEE_GWEI")
  const mintGasLimit = getContractEnv("NFT_MINT_GAS_LIMIT") || getContractEnv("MINT_GAS_LIMIT")

  const overrides: {
    gasLimit?: bigint
    maxPriorityFeePerGas?: bigint
    maxFeePerGas?: bigint
  } = {}

  overrides.gasLimit = BigInt(mintGasLimit || DEFAULT_MINT_GAS_LIMIT.toString())

  if (maxPriorityFeeGwei) {
    overrides.maxPriorityFeePerGas = parseUnits(maxPriorityFeeGwei, "gwei")
  }

  if (maxFeeGwei) {
    overrides.maxFeePerGas = parseUnits(maxFeeGwei, "gwei")
  }

  return overrides
}

export const mintMembershipNft = async ({
  recipientWallet,
  displayName,
  department,
  imageUri,
  funFacts,
}: MintMembershipInput) => {
  const rpcUrl = getRequiredContractEnv("POLYGON_RPC_URL")
  const contractAddress = getRequiredContractEnv("NFT_CONTRACT_ADDRESS")
  const privateKey = getRequiredContractEnv("DEPLOYER_WALLET_PRIVATE_KEY")
  const publicKey = getRequiredContractEnv("DEPLOYER_WALLET_PUBLIC_KEY")
  const configuredChainId = BigInt(getContractEnv("CHAIN_ID") || "137")

  const provider = new JsonRpcProvider(rpcUrl)
  const network = await provider.getNetwork()
  if (network.chainId !== configuredChainId) {
    throw new Error(`Configured CHAIN_ID ${configuredChainId} does not match RPC chain ${network.chainId}.`)
  }

  const signer = new Wallet(privateKey, provider)
  if (signer.address.toLowerCase() !== publicKey.toLowerCase()) {
    throw new Error("DEPLOYER_WALLET_PUBLIC_KEY does not match DEPLOYER_WALLET_PRIVATE_KEY.")
  }

  const contract = new Contract(contractAddress, tbcMembershipNftAbi, signer)
  const tx = await contract.mintMembership(
    recipientWallet,
    displayName,
    department,
    sanitizeMintImageUri(imageUri),
    funFacts,
    buildFeeOverrides()
  )

  const receipt = await tx.wait()
  if (!receipt || receipt.status === null || Number(receipt.status) !== 1) {
    throw new Error("Mint transaction failed on-chain.")
  }

  return {
    hash: tx.hash,
    blockNumber: receipt.blockNumber,
  }
}
