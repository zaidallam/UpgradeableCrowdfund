const Crowdfund = artifacts.require("Crowdfund");
const CrowdfundToken = artifacts.require("CrowdfundToken");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const ethers = require("ethers");
const assert = require("assert");
const { time } = require("@openzeppelin/test-helpers");

contract("Crowdfund", (accounts) => {
  let crowdfund, token;

  before(async function () {
    token = await CrowdfundToken.deployed();
    crowdfund = await deployProxy(Crowdfund, [token.address]);
  });

  it("Test", async function () {
    assert(token.address == (await crowdfund.token()));

    await token.transfer(accounts[1], ethers.utils.parseUnits("300", 18));
    await token.transfer(accounts[2], ethers.utils.parseUnits("300", 18));
    await token.transfer(accounts[3], ethers.utils.parseUnits("300", 18));
    await token.approve(crowdfund.address, ethers.utils.parseUnits("300", 18), {
      from: accounts[1],
    });
    await token.approve(crowdfund.address, ethers.utils.parseUnits("300", 18), {
      from: accounts[2],
    });
    await token.approve(crowdfund.address, ethers.utils.parseUnits("300", 18), {
      from: accounts[3],
    });

    await crowdfund.launch(
      "Project that will be aborted",
      ethers.utils.parseUnits("300", 18),
      Math.floor(Date.now() / 1000 + 907_200)
    );
    await crowdfund.launch(
      "Project that will not meet funding goal",
      ethers.utils.parseUnits("300", 18),
      Math.floor(Date.now() / 1000 + 907_200)
    );
    await crowdfund.launch(
      "Project that will meet funding goal",
      ethers.utils.parseUnits("300", 18),
      Math.floor(Date.now() / 1000 + 907_200)
    );

    try {
      await crowdfund.launch(
        "Crowdfund that should fail",
        ethers.utils.parseUnits("100", 18),
        Math.floor(Date.now() / 1000 + 1000)
      );
      assert(false);
    } catch {
      assert(true);
    }

    try {
      await crowdfund.claim(3);
      assert(false);
    } catch (e) {
      assert(e.message.includes("This project is still ongoing"));
    }

    await crowdfund.abort(1);

    await crowdfund.contribute(3, ethers.utils.parseUnits("100", 18), {
      from: accounts[1],
    });
    await crowdfund.contribute(3, ethers.utils.parseUnits("100", 18), {
      from: accounts[2],
    });
    await crowdfund.contribute(3, ethers.utils.parseUnits("100", 18), {
      from: accounts[3],
    });

    await crowdfund.contribute(2, ethers.utils.parseUnits("100", 18), {
      from: accounts[1],
    });

    await time.increase(1_000_000);

    try {
      await crowdfund.contribute(3, ethers.utils.parseUnits("100", 18), {
        from: accounts[1],
      });
      assert(false);
    } catch (e) {
      assert(e.message.includes("This project has already ended"));
    }

    try {
      await crowdfund.abort(2);
      assert(false);
    } catch (e) {
      assert(e.message.includes("This project has already ended"));
    }

    try {
      await crowdfund.refund(3, {
        from: accounts[1],
      });
      assert(false);
    } catch (e) {
      assert(e.message.includes("This project has met its funding goal"));
    }

    try {
      await crowdfund.claim(3, {
        from: accounts[1],
      });
      assert(false);
    } catch (e) {
      assert(e.message.includes("This project isn't yours"));
    }

    await crowdfund.claim(3);

    try {
      await crowdfund.claim(3);
      assert(false);
    } catch (e) {
      assert(
        e.message.includes("You've already claimed the funds from this project")
      );
    }

    await crowdfund.refund(2, {
      from: accounts[1],
    });
  });
});
