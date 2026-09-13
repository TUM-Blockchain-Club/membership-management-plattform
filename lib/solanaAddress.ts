import { publicKey } from '@metaplex-foundation/umi'

export const isSolanaPublicKey = (value: string) => {
  try {
    publicKey(value)
    return true
  } catch {
    return false
  }
}
