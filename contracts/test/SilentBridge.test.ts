import { expect } from "chai";
import { ethers } from "hardhat";
import { SilentBridge } from "../typechain-types";
import { MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SilentBridge", function () {
  let bridge: SilentBridge;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let executor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const MIN_DEPOSIT = ethers.parseEther("0.001");
  const DEPOSIT_AMOUNT = ethers.parseEther("1.0");
  const TOKEN_AMOUNT = ethers.parseUnits("1000", 6);

  beforeEach(async function () {
    [owner, executor, user1, user2] = await ethers.getSigners();

    // Deploy SilentBridge
    const SilentBridgeFactory = await ethers.getContractFactory("SilentBridge");
    bridge = await SilentBridgeFactory.deploy(owner.address, MIN_DEPOSIT);
    await bridge.waitForDeployment();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy(
      "Test Token",
      "TEST",
      6,
      ethers.parseUnits("1000000", 6)
    );
    await mockToken.waitForDeployment();

    // Add executor
    await bridge.connect(owner).addExecutor(executor.address);

    // Mint tokens to user1
    await mockToken.mint(user1.address, TOKEN_AMOUNT);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await bridge.owner()).to.equal(owner.address);
    });

    it("Should set the minimum deposit amount", async function () {
      expect(await bridge.minDepositAmount()).to.equal(MIN_DEPOSIT);
    });

    it("Should set the chain ID", async function () {
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
      expect(await bridge.chainId()).to.equal(chainId);
    });
  });

  describe("Deposit", function () {
    const targetChainId = 11155111; // Sepolia
    const encryptedRoutingIntent = ethers.toUtf8Bytes("encrypted_routing_intent");

    it("Should deposit native ETH successfully", async function () {
      const tx = await bridge.connect(user1).deposit(
        ethers.ZeroAddress,
        DEPOSIT_AMOUNT,
        targetChainId,
        encryptedRoutingIntent,
        { value: DEPOSIT_AMOUNT }
      );

      const receipt = await tx.wait();
      const depositEvent = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("Deposit(bytes32,address,address,uint256,uint256,uint256,bytes)")
      );

      expect(depositEvent).to.not.be.undefined;
    });

    it("Should deposit ERC20 tokens successfully", async function () {
      await mockToken.connect(user1).approve(await bridge.getAddress(), TOKEN_AMOUNT);

      const tx = await bridge.connect(user1).deposit(
        await mockToken.getAddress(),
        TOKEN_AMOUNT,
        targetChainId,
        encryptedRoutingIntent
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check token balance
      expect(await mockToken.balanceOf(await bridge.getAddress())).to.equal(TOKEN_AMOUNT);
    });

    it("Should reject deposit below minimum amount", async function () {
      const smallAmount = ethers.parseEther("0.0001");

      await expect(
        bridge.connect(user1).deposit(
          ethers.ZeroAddress,
          smallAmount,
          targetChainId,
          encryptedRoutingIntent,
          { value: smallAmount }
        )
      ).to.be.revertedWith("SilentBridge: amount too small");
    });

    it("Should reject deposit to same chain", async function () {
      const chainId = await ethers.provider.getNetwork().then(n => n.chainId);

      await expect(
        bridge.connect(user1).deposit(
          ethers.ZeroAddress,
          DEPOSIT_AMOUNT,
          chainId,
          encryptedRoutingIntent,
          { value: DEPOSIT_AMOUNT }
        )
      ).to.be.revertedWith("SilentBridge: invalid target chain");
    });

    it("Should reject deposit when paused", async function () {
      await bridge.connect(owner).pause();

      await expect(
        bridge.connect(user1).deposit(
          ethers.ZeroAddress,
          DEPOSIT_AMOUNT,
          targetChainId,
          encryptedRoutingIntent,
          { value: DEPOSIT_AMOUNT }
        )
      ).to.be.revertedWithCustomError(bridge, "EnforcedPause");
    });
  });

  describe("Withdrawal", function () {
    const sourceChainId = 11155111; // Sepolia
    const targetChainId = 421614; // Arbitrum Sepolia
    const encryptedRoutingIntent = ethers.toUtf8Bytes("encrypted_routing_intent");
    let depositId: string;

    beforeEach(async function () {
      // Create a deposit
      const tx = await bridge.connect(user1).deposit(
        ethers.ZeroAddress,
        DEPOSIT_AMOUNT,
        targetChainId,
        encryptedRoutingIntent,
        { value: DEPOSIT_AMOUNT }
      );

      const receipt = await tx.wait();
      const depositEvent = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("Deposit(bytes32,address,address,uint256,uint256,uint256,bytes)")
      );
      
      if (depositEvent) {
        depositId = depositEvent.topics[1];
      }
    });

    it("Should execute withdrawal successfully", async function () {
      const initialBalance = await ethers.provider.getBalance(user2.address);

      await bridge.connect(executor).withdraw(
        depositId,
        user2.address,
        ethers.ZeroAddress,
        DEPOSIT_AMOUNT,
        sourceChainId,
        ethers.toUtf8Bytes("proof")
      );

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should reject withdrawal from non-executor", async function () {
      await expect(
        bridge.connect(user1).withdraw(
          depositId,
          user2.address,
          ethers.ZeroAddress,
          DEPOSIT_AMOUNT,
          sourceChainId,
          ethers.toUtf8Bytes("proof")
        )
      ).to.be.revertedWith("SilentBridge: not an executor");
    });

    it("Should prevent double withdrawal", async function () {
      await bridge.connect(executor).withdraw(
        depositId,
        user2.address,
        ethers.ZeroAddress,
        DEPOSIT_AMOUNT,
        sourceChainId,
        ethers.toUtf8Bytes("proof")
      );

      await expect(
        bridge.connect(executor).withdraw(
          depositId,
          user2.address,
          ethers.ZeroAddress,
          DEPOSIT_AMOUNT,
          sourceChainId,
          ethers.toUtf8Bytes("proof")
        )
      ).to.be.revertedWith("SilentBridge: deposit already used");
    });
  });

  describe("Routing Intent", function () {
    const targetChainId = 11155111;
    const encryptedRoutingIntent = ethers.toUtf8Bytes("encrypted_routing_intent");
    const newEncryptedRoutingIntent = ethers.toUtf8Bytes("new_encrypted_routing_intent");
    let depositId: string;

    beforeEach(async function () {
      const tx = await bridge.connect(user1).deposit(
        ethers.ZeroAddress,
        DEPOSIT_AMOUNT,
        targetChainId,
        encryptedRoutingIntent,
        { value: DEPOSIT_AMOUNT }
      );

      const receipt = await tx.wait();
      const depositEvent = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("Deposit(bytes32,address,address,uint256,uint256,uint256,bytes)")
      );
      
      if (depositEvent) {
        depositId = depositEvent.topics[1];
      }
    });

    it("Should update routing intent", async function () {
      await bridge.connect(user1).updateRoutingIntent(depositId, newEncryptedRoutingIntent);

      const deposit = await bridge.getDeposit(depositId);
      expect(ethers.toUtf8String(deposit.encryptedRoutingIntent)).to.equal(
        ethers.toUtf8String(newEncryptedRoutingIntent)
      );
    });

    it("Should reject update from non-owner", async function () {
      await expect(
        bridge.connect(user2).updateRoutingIntent(depositId, newEncryptedRoutingIntent)
      ).to.be.revertedWith("SilentBridge: not deposit owner");
    });
  });

  describe("Access Control", function () {
    it("Should add executor", async function () {
      await bridge.connect(owner).addExecutor(user2.address);
      expect(await bridge.executors(user2.address)).to.be.true;
    });

    it("Should remove executor", async function () {
      await bridge.connect(owner).removeExecutor(executor.address);
      expect(await bridge.executors(executor.address)).to.be.false;
    });

    it("Should reject non-owner from adding executor", async function () {
      await expect(
        bridge.connect(user1).addExecutor(user2.address)
      ).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause contract", async function () {
      await bridge.connect(owner).pause();
      expect(await bridge.paused()).to.be.true;
    });

    it("Should unpause contract", async function () {
      await bridge.connect(owner).pause();
      await bridge.connect(owner).unpause();
      expect(await bridge.paused()).to.be.false;
    });

    it("Should reject non-owner from pausing", async function () {
      await expect(
        bridge.connect(user1).pause()
      ).to.be.revertedWithCustomError(bridge, "OwnableUnauthorizedAccount");
    });
  });
});

