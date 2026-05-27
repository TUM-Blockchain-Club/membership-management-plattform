export const tbcMembershipNftAbi = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "string", name: "memberName", type: "string" },
      { internalType: "string", name: "department", type: "string" },
      { internalType: "string", name: "imageURI", type: "string" },
      { internalType: "string", name: "funFacts", type: "string" },
    ],
    name: "mintMembership",
    outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const
