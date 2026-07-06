const hre = require("hardhat");

async function main() {
  console.log("Deploying DocumentRegistry...");
  
  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
  const documentRegistry = await DocumentRegistry.deploy();
  
  await documentRegistry.waitForDeployment();
  
  const address = await documentRegistry.getAddress();
  console.log("DocumentRegistry deployed to:", address);
  
  // Save the address for frontend use
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ DocumentRegistry: address }, null, 2)
  );

  // Export the compiled ABI so the frontend copy can never go stale
  const artifact = require("../artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json");
  fs.writeFileSync(
    contractsDir + "/DocumentRegistry.abi.json",
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log("Contract address and ABI saved to frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });