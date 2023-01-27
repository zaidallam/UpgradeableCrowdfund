const CrowdfundToken = artifacts.require("CrowdfundToken");
const Crowdfund = artifacts.require("Crowdfund");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  await deployer.deploy(CrowdfundToken);
  const tokenAddress = CrowdfundToken.address;
  await deployProxy(Crowdfund, [tokenAddress], { deployer });
};
