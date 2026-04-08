import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const ROLE_MANAGER_ABI = [
  "function MANUFACTURER_ROLE() view returns (bytes32)",
  "function DISTRIBUTOR_ROLE() view returns (bytes32)",
  "function PHARMACY_ROLE() view returns (bytes32)",
  "function grantRole(bytes32 role, address account) external",
];

const ALLOWED_ROLES = new Set(["MANUFACTURER", "DISTRIBUTOR", "PHARMACY"]);

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_CHAIN_ID !== "31337") {
    return NextResponse.json(
      { error: "Demo role grants are only enabled on localhost." },
      { status: 403 }
    );
  }

  const roleManagerAddress = process.env.NEXT_PUBLIC_ROLE_MANAGER_ADDRESS;
  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_URL;
  const privateKey = process.env.LOCAL_ADMIN_PRIVATE_KEY;

  if (!roleManagerAddress || !rpcUrl || !privateKey) {
    return NextResponse.json(
      { error: "Local admin role grant is not configured." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    address?: string;
    role?: string;
  };

  if (!body.address || !ethers.isAddress(body.address)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  if (!body.role || !ALLOWED_ROLES.has(body.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const roleManager = new ethers.Contract(
      roleManagerAddress,
      ROLE_MANAGER_ABI,
      signer
    );

    const roleBytes = await roleManager[`${body.role}_ROLE` as const]();
    const tx = await roleManager.grantRole(roleBytes, body.address);
    await tx.wait();

    return NextResponse.json({ ok: true, hash: tx.hash });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to grant role.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
