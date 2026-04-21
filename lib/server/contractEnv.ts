import fs from "node:fs"
import path from "node:path"

let cachedContractsEnv: Record<string, string> | null = null

const parseEnvFile = (raw: string) => {
  const entries: Record<string, string> = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    entries[key] = value
  }

  return entries
}

const loadContractsEnv = () => {
  if (cachedContractsEnv) {
    return cachedContractsEnv
  }

  const contractsEnvPath = path.resolve(process.cwd(), "..", "contracts", ".env")

  try {
    const raw = fs.readFileSync(contractsEnvPath, "utf-8")
    cachedContractsEnv = parseEnvFile(raw)
  } catch {
    cachedContractsEnv = {}
  }

  return cachedContractsEnv
}

export const getContractEnv = (key: string) => {
  const directValue = process.env[key]?.trim()
  if (directValue) {
    return directValue
  }

  const fallbackValue = loadContractsEnv()[key]?.trim()
  return fallbackValue || null
}

export const getRequiredContractEnv = (key: string) => {
  const value = getContractEnv(key)
  if (!value) {
    throw new Error(`Missing required contract environment variable: ${key}`)
  }

  return value
}
