const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MediChain", function () {
  // ─── Shared fixtures ─────────────────────────────────────────────
  let roleManager, medichain;
  let admin, manufacturer, distributor, pharmacy, stranger;

  const BATCH_ID      = "BATCH-2025-001";
  const MEDICINE_NAME = "Paracetamol 500mg";
  const MANUFACTURER  = "Sun Pharma";
  const QUANTITY      = 1000n;
  const IPFS_HASH     = "QmExampleHash123";

  async function twoYearsFromNow() {
    const latest = await time.latest();
    return latest + 2 * 365 * 24 * 3600;
  }

  async function deployContracts() {
    [admin, manufacturer, distributor, pharmacy, stranger] = await ethers.getSigners();

    const RoleManager = await ethers.getContractFactory("RoleManager");
    roleManager = await RoleManager.deploy(admin.address);
    await roleManager.waitForDeployment();

    const MediChainCore = await ethers.getContractFactory("MediChainCore");
    medichain = await MediChainCore.deploy(await roleManager.getAddress());
    await medichain.waitForDeployment();

    // Grant roles
    await roleManager.connect(admin).grantRole(await roleManager.MANUFACTURER_ROLE(), manufacturer.address);
    await roleManager.connect(admin).grantRole(await roleManager.DISTRIBUTOR_ROLE(), distributor.address);
    await roleManager.connect(admin).grantRole(await roleManager.PHARMACY_ROLE(), pharmacy.address);
  }

  beforeEach(async function () {
    await deployContracts();
  });

  // ─────────────────────────────────────────────────────────────────
  describe("1. Deployment", function () {
    it("should set deployer as owner", async function () {
      expect(await medichain.owner()).to.equal(admin.address);
    });

    it("should not be paused initially", async function () {
      expect(await medichain.paused()).to.be.false;
    });

    it("should store the RoleManager address", async function () {
      expect(await medichain.roleManager()).to.equal(await roleManager.getAddress());
    });

    it("should have zero batches initially", async function () {
      expect(await medichain.getTotalBatches()).to.equal(0n);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("2. Role Management", function () {
    it("admin should have DEFAULT_ADMIN_ROLE", async function () {
      const ADMIN_ROLE = await roleManager.DEFAULT_ADMIN_ROLE();
      expect(await roleManager.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("admin can grant MANUFACTURER_ROLE", async function () {
      const MANUFACTURER_ROLE = await roleManager.MANUFACTURER_ROLE();
      expect(await roleManager.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
    });

    it("admin can grant DISTRIBUTOR_ROLE", async function () {
      const DISTRIBUTOR_ROLE = await roleManager.DISTRIBUTOR_ROLE();
      expect(await roleManager.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
    });

    it("admin can grant PHARMACY_ROLE", async function () {
      const PHARMACY_ROLE = await roleManager.PHARMACY_ROLE();
      expect(await roleManager.hasRole(PHARMACY_ROLE, pharmacy.address)).to.be.true;
    });

    it("non-admin cannot grant roles", async function () {
      const MANUFACTURER_ROLE = await roleManager.MANUFACTURER_ROLE();
      await expect(
        roleManager.connect(stranger).grantRole(MANUFACTURER_ROLE, stranger.address)
      ).to.be.reverted;
    });

    it("admin can revoke a role", async function () {
      const MANUFACTURER_ROLE = await roleManager.MANUFACTURER_ROLE();
      await roleManager.connect(admin).revokeRole(MANUFACTURER_ROLE, manufacturer.address);
      expect(await roleManager.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.false;
    });

    it("emits RoleGrantedTo event on grant", async function () {
      const PHARMACY_ROLE = await roleManager.PHARMACY_ROLE();
      const tx = roleManager.connect(admin).grantRole(PHARMACY_ROLE, stranger.address);
      await expect(tx).to.emit(roleManager, "RoleGrantedTo");
      const receipt = await (await tx).wait();
      const event = receipt?.logs.find(
        (log) => roleManager.interface.parseLog(log)?.name === "RoleGrantedTo"
      );
      expect(event).to.not.be.undefined;
    });

    it("isManufacturer / isDistributor / isPharmacy helpers work", async function () {
      expect(await roleManager.isManufacturer(manufacturer.address)).to.be.true;
      expect(await roleManager.isDistributor(distributor.address)).to.be.true;
      expect(await roleManager.isPharmacy(pharmacy.address)).to.be.true;
      expect(await roleManager.isManufacturer(stranger.address)).to.be.false;
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("3. Batch Registration", function () {
    it("manufacturer can register a batch", async function () {
      const expiry = await twoYearsFromNow();
      await expect(
        medichain.connect(manufacturer).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
        )
      ).to.emit(medichain, "BatchRegistered")
       .withArgs(BATCH_ID, manufacturer.address, await time.latest() + 1);

      expect(await medichain.batchExists(BATCH_ID)).to.be.true;
      expect(await medichain.getTotalBatches()).to.equal(1n);
    });

    it("registered batch has correct data", async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
      );
      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.medicineName).to.equal(MEDICINE_NAME);
      expect(batch.manufacturer).to.equal(MANUFACTURER);
      expect(batch.manufacturerAddr).to.equal(manufacturer.address);
      expect(batch.quantity).to.equal(QUANTITY);
      expect(batch.dispensedCount).to.equal(0n);
      expect(batch.ipfsHash).to.equal(IPFS_HASH);
      expect(batch.status).to.equal(0); // Manufactured
    });

    it("duplicate batchId reverts", async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
      );
      await expect(
        medichain.connect(manufacturer).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
        )
      ).to.be.revertedWith("MediChain: batchId already registered");
    });

    it("reverts when expiry is in the past", async function () {
      const pastExpiry = (await time.latest()) - 1000;
      await expect(
        medichain.connect(manufacturer).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, pastExpiry, QUANTITY, IPFS_HASH
        )
      ).to.be.revertedWith("MediChain: expiry must be in the future");
    });

    it("reverts with zero quantity", async function () {
      const expiry = await twoYearsFromNow();
      await expect(
        medichain.connect(manufacturer).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, 0, IPFS_HASH
        )
      ).to.be.revertedWith("MediChain: quantity must be > 0");
    });

    it("reverts with empty batchId", async function () {
      const expiry = await twoYearsFromNow();
      await expect(
        medichain.connect(manufacturer).registerBatch(
          "", MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
        )
      ).to.be.revertedWith("MediChain: batchId cannot be empty");
    });

    it("non-manufacturer cannot register", async function () {
      const expiry = await twoYearsFromNow();
      await expect(
        medichain.connect(stranger).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
        )
      ).to.be.revertedWith("MediChain: caller is not a manufacturer");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("4. Transfer & Dispense Tests", function () {
    async function registerBatch() {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
      );
    }

    it("manufacturer can transfer to distributor", async function () {
      await registerBatch();
      await expect(
        medichain.connect(manufacturer).transferToDistributor(
          BATCH_ID, distributor.address, "Mumbai Warehouse", "Initial dispatch"
        )
      )
        .to.emit(medichain, "BatchTransferred")
        .withArgs(BATCH_ID, manufacturer.address, distributor.address, "MANUFACTURER", "Mumbai Warehouse", "Initial dispatch", 1);

      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.status).to.equal(1); // InTransit
    });

    it("distributor can transfer to pharmacy", async function () {
      await registerBatch();
      await medichain.connect(manufacturer).transferToDistributor(
        BATCH_ID, distributor.address, "Mumbai", "dispatch"
      );
      await expect(
        medichain.connect(distributor).transferToPharmacy(
          BATCH_ID, pharmacy.address, "Delhi Hub", "Delivered"
        )
      )
        .to.emit(medichain, "BatchTransferred")
        .withArgs(BATCH_ID, distributor.address, pharmacy.address, "DISTRIBUTOR", "Delhi Hub", "Delivered", 2);

      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.status).to.equal(2); // AtPharmacy
    });

    it("pharmacy can dispense partial units", async function () {
      await registerBatch();
      await medichain.connect(manufacturer).transferToDistributor(
        BATCH_ID, distributor.address, "Mumbai", "dispatch"
      );
      await medichain.connect(distributor).transferToPharmacy(
        BATCH_ID, pharmacy.address, "Delhi", "delivery"
      );
      await expect(medichain.connect(pharmacy).dispenseUnits(BATCH_ID, 20n))
        .to.emit(medichain, "BatchDispensed")
        .withArgs(BATCH_ID, pharmacy.address, 20n, await time.latest() + 1);

      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.dispensedCount).to.equal(20n);
      expect(batch.status).to.equal(2); // Still AtPharmacy
    });

    it("pharmacy batch turns totally Sold when all units dispensed", async function () {
        await registerBatch();
        await medichain.connect(manufacturer).transferToDistributor(
          BATCH_ID, distributor.address, "Mumbai", "dispatch"
        );
        await medichain.connect(distributor).transferToPharmacy(
          BATCH_ID, pharmacy.address, "Delhi", "delivery"
        );
        await medichain.connect(pharmacy).dispenseUnits(BATCH_ID, QUANTITY);
  
        const batch = await medichain.verifyBatch(BATCH_ID);
        expect(batch.dispensedCount).to.equal(QUANTITY);
        expect(batch.status).to.equal(3); // Sold
      });

      it("pharmacy cannot dispense more than available", async function () {
        await registerBatch();
        await medichain.connect(manufacturer).transferToDistributor(
          BATCH_ID, distributor.address, "Mumbai", "dispatch"
        );
        await medichain.connect(distributor).transferToPharmacy(
          BATCH_ID, pharmacy.address, "Delhi", "delivery"
        );
        await expect(medichain.connect(pharmacy).dispenseUnits(BATCH_ID, QUANTITY + 1n))
        .to.be.revertedWith("MediChain: not enough units left in batch");
      });

    it("wrong role cannot transfer to distributor", async function () {
      await registerBatch();
      await expect(
        medichain.connect(stranger).transferToDistributor(
          BATCH_ID, distributor.address, "Loc", "notes"
        )
      ).to.be.revertedWith("MediChain: caller is not a manufacturer");
    });

    it("cannot transfer to non-distributor address", async function () {
      await registerBatch();
      await expect(
        medichain.connect(manufacturer).transferToDistributor(
          BATCH_ID, stranger.address, "Loc", "notes"
        )
      ).to.be.revertedWith("MediChain: recipient is not a registered distributor");
    });

    it("cannot skip distributor step (manufacturer → pharmacy directly)", async function () {
      await registerBatch();
      await roleManager.connect(admin).grantRole(await roleManager.DISTRIBUTOR_ROLE(), manufacturer.address);
      await expect(
        medichain.connect(manufacturer).transferToPharmacy(
          BATCH_ID, pharmacy.address, "skip", "skip"
        )
      ).to.be.revertedWith("MediChain: batch not in InTransit state");
    });

    it("non-owner cannot transfer batch", async function () {
      await registerBatch();
      const MANUFACTURER_ROLE = await roleManager.MANUFACTURER_ROLE();
      await roleManager.connect(admin).grantRole(MANUFACTURER_ROLE, stranger.address);
      await expect(
        medichain.connect(stranger).transferToDistributor(
          BATCH_ID, distributor.address, "Loc", "notes"
        )
      ).to.be.revertedWith("MediChain: caller is not the batch owner");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("5. Verification Tests", function () {
    beforeEach(async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
      );
    });

    it("verifyBatch returns correct batch", async function () {
      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.batchId).to.equal(BATCH_ID);
      expect(batch.medicineName).to.equal(MEDICINE_NAME);
    });

    it("verifyBatch reverts for non-existent batch", async function () {
      await expect(medichain.verifyBatch("FAKE-ID"))
        .to.be.revertedWith("MediChain: batch not found");
    });

    it("isBatchGenuine returns true for valid batch", async function () {
      const [genuine, status] = await medichain.isBatchGenuine(BATCH_ID);
      expect(genuine).to.be.true;
      expect(status).to.equal("MANUFACTURED");
    });

    it("isBatchGenuine returns false for non-existent batch", async function () {
      const [genuine, status] = await medichain.isBatchGenuine("GHOST-ID");
      expect(genuine).to.be.false;
      expect(status).to.equal("NOT_FOUND");
    });

    it("isBatchGenuine returns false for recalled batch", async function () {
      await medichain.connect(manufacturer).recallBatch(BATCH_ID, "Test recall");
      const [genuine, status] = await medichain.isBatchGenuine(BATCH_ID);
      expect(genuine).to.be.false;
      expect(status).to.equal("RECALLED");
    });

    it("isBatchGenuine returns false for expired batch", async function () {
      const shortExpiry = (await time.latest()) + 3600;
      await medichain.connect(manufacturer).registerBatch(
        "EXPIRING-BATCH", "Aspirin", "Bayer", shortExpiry, 100, ""
      );
      await time.increase(3601);
      const [genuine, status] = await medichain.isBatchGenuine("EXPIRING-BATCH");
      expect(genuine).to.be.false;
      expect(status).to.equal("EXPIRED");
    });

    it("Event logs return all transferred records", async function () {
      await medichain.connect(manufacturer).transferToDistributor(
        BATCH_ID, distributor.address, "Mumbai", "dispatch"
      );
      const logs = await medichain.queryFilter(medichain.filters.BatchTransferred(BATCH_ID));
      expect(logs.length).to.equal(2); // 1 on Registration, 1 on Transfer
      expect(logs[1].args[3]).to.equal("MANUFACTURER"); // role argument
      expect(logs[1].args[1]).to.equal(manufacturer.address); // from
      expect(logs[1].args[2]).to.equal(distributor.address); // to
    });

    it("batchExists works correctly", async function () {
      expect(await medichain.batchExists(BATCH_ID)).to.be.true;
      expect(await medichain.batchExists("NOT-EXISTS")).to.be.false;
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("6. Recall Tests", function () {
    beforeEach(async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
      );
    });

    it("manufacturer can recall their batch", async function () {
      const reason = "Contamination found in QC";
      await expect(medichain.connect(manufacturer).recallBatch(BATCH_ID, reason))
        .to.emit(medichain, "BatchRecalled");

      const batch = await medichain.verifyBatch(BATCH_ID);
      expect(batch.status).to.equal(4); // Recalled
    });

    it("recall reason is stored correctly", async function () {
      const reason = "Safety hazard";
      await medichain.connect(manufacturer).recallBatch(BATCH_ID, reason);
      expect(await medichain.getRecallReason(BATCH_ID)).to.equal(reason);
    });

    it("non-manufacturer cannot recall", async function () {
      await expect(
        medichain.connect(stranger).recallBatch(BATCH_ID, "malicious")
      ).to.be.revertedWith("MediChain: caller is not a manufacturer");
    });

    it("a different manufacturer cannot recall another's batch", async function () {
      const MANUFACTURER_ROLE = await roleManager.MANUFACTURER_ROLE();
      await roleManager.connect(admin).grantRole(MANUFACTURER_ROLE, stranger.address);
      await expect(
        medichain.connect(stranger).recallBatch(BATCH_ID, "unauthorized recall")
      ).to.be.revertedWith("MediChain: only original manufacturer can recall");
    });

    it("cannot recall an already recalled batch", async function () {
      await medichain.connect(manufacturer).recallBatch(BATCH_ID, "first recall");
      await expect(
        medichain.connect(manufacturer).recallBatch(BATCH_ID, "second recall")
      ).to.be.revertedWith("MediChain: batch already recalled");
    });

    it("cannot transfer recalled batch", async function () {
      await medichain.connect(manufacturer).recallBatch(BATCH_ID, "safety issue");
      await expect(
        medichain.connect(manufacturer).transferToDistributor(
          BATCH_ID, distributor.address, "Loc", "notes"
        )
      ).to.be.revertedWith("MediChain: batch has been recalled");
    });

    it("recall increments totalRecalls", async function () {
      expect(await medichain.totalRecalls()).to.equal(0n);
      await medichain.connect(manufacturer).recallBatch(BATCH_ID, "test recall");
      expect(await medichain.totalRecalls()).to.equal(1n);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("7. Pause / Emergency", function () {
    it("owner can pause the contract", async function () {
      await medichain.connect(admin).pause();
      expect(await medichain.paused()).to.be.true;
    });

    it("non-owner cannot pause", async function () {
      await expect(medichain.connect(stranger).pause()).to.be.reverted;
    });

    it("registration is blocked when paused", async function () {
      await medichain.connect(admin).pause();
      const expiry = await twoYearsFromNow();
      await expect(
        medichain.connect(manufacturer).registerBatch(
          BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, IPFS_HASH
        )
      ).to.be.reverted;
    });

    it("owner can unpause", async function () {
      await medichain.connect(admin).pause();
      await medichain.connect(admin).unpause();
      expect(await medichain.paused()).to.be.false;
    });
  });

  // ─────────────────────────────────────────────────────────────────
  describe("8. Stats & Enumeration", function () {
    it("getStats returns correct counts", async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        BATCH_ID, MEDICINE_NAME, MANUFACTURER, expiry, QUANTITY, ""
      );
      await medichain.connect(manufacturer).transferToDistributor(
        BATCH_ID, distributor.address, "Loc", "notes"
      );
      await medichain.connect(manufacturer).registerBatch(
        "BATCH-002", "Aspirin", "Bayer", expiry, 100, ""
      );
      await medichain.connect(manufacturer).recallBatch("BATCH-002", "recall");

      const [totalBatches, totalTransfers, totalRecalls] = await medichain.getStats();
      expect(totalBatches).to.equal(2n);
      expect(totalTransfers).to.equal(1n);
      expect(totalRecalls).to.equal(1n);
    });

    it("getAllBatchIds returns all registered IDs", async function () {
      const expiry = await twoYearsFromNow();
      await medichain.connect(manufacturer).registerBatch(
        "B1", "Med1", "Mfr1", expiry, 100, ""
      );
      await medichain.connect(manufacturer).registerBatch(
        "B2", "Med2", "Mfr2", expiry, 200, ""
      );
      const ids = await medichain.getAllBatchIds();
      expect(ids.length).to.equal(2);
      expect(ids[0]).to.equal("B1");
      expect(ids[1]).to.equal("B2");
    });
  });
});
