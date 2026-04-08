const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Read the deployed addresses from the ABI file written by deploy.js
  const abiPath = path.join(__dirname, "../frontend/public/abi/MediChain.json");

  if (!fs.existsSync(abiPath)) {
    throw new Error(
      "ABI file not found. Run deploy.js first: npx hardhat run scripts/deploy.js --network sepolia"
    );
  }

  const abiData = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const { medichain, roleManager } = abiData;

  if (!medichain?.address || !roleManager?.address) {
    throw new Error("Deployed addresses not found in ABI file.");
  }

  console.log("=".repeat(60));
  console.log("  MediChain Contract Verification");
  console.log("=".repeat(60));
  console.log(`RoleManager:   ${roleManager.address}`);
  console.log(`MediChainCore: ${medichain.address}`);
  console.log("");

  // Get deployer from env to pass as constructor arg
  const { ethers } = require("hardhat");
  const [deployer] = await ethers.getSigners();

  // ─── Verify RoleManager ──────────────────────────────────────
  console.log("Verifying RoleManager...");
  try {
    await run("verify:verify", {
      address: roleManager.address,
      constructorArguments: [deployer.address],
    });
    console.log("RoleManager verified!");
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("RoleManager already verified.");
    } else {
      console.error("RoleManager verification failed:", err.message);
    }
  }

  // ─── Verify MediChainCore ────────────────────────────────────
  console.log("\nVerifying MediChainCore...");
  try {
    await run("verify:verify", {
      address: medichain.address,
      constructorArguments: [roleManager.address],
    });
    console.log("MediChainCore verified!");
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("MediChainCore already verified.");
    } else {
      console.error("MediChainCore verification failed:", err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  View on Etherscan:`);
  console.log(`  https://sepolia.etherscan.io/address/${medichain.address}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
