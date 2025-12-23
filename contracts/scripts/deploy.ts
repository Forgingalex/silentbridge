import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy SilentBridge
  const SilentBridge = await ethers.getContractFactory("SilentBridge");
  const minDepositAmount = ethers.parseEther("0.001"); // 0.001 ETH minimum deposit
  
  const bridge = await SilentBridge.deploy(
    deployer.address, // owner
    minDepositAmount // min deposit amount
  );

  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();

  console.log("SilentBridge deployed to:", bridgeAddress);
  console.log("Chain ID:", await ethers.provider.getNetwork().then(n => n.chainId));
  console.log("Min Deposit Amount:", ethers.formatEther(minDepositAmount), "ETH");

  // Deploy Mock ERC20 for testing (optional)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy(
    "USD Coin",
    "USDC",
    6,
    ethers.parseUnits("1000000", 6) // 1M USDC
  );

  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();

  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      SilentBridge: bridgeAddress,
      MockUSDC: mockUSDCAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

