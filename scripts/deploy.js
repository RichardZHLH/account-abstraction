// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require('fs');

let  deployed = {}
if(fs.existsSync(__dirname+`/../deployed/${hre.network.name}.json`)) {
  deployed = require(__dirname+`/../deployed/${hre.network.name}.json`)
}




async function main() {
  let [deployer] = await hre.ethers.getSigners();
  deployer = deployer.address
  console.log("deployer:", deployer)


  let EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
  let entryPoint = await EntryPoint.deploy();
  console.log("entryPoint deployed to:", entryPoint.address);
  deployed.entryPoint = entryPoint.address
  await entryPoint.deployed()

  let SimpleAccountFactory = await hre.ethers.getContractFactory("SimpleAccountFactory");
  let simpleAccountFactory = await SimpleAccountFactory.deploy(entryPoint.address);
  console.log("simpleAccountFactory deployed to:", simpleAccountFactory.address);
  deployed.simpleAccountFactory = simpleAccountFactory.address
  await entryPoint.deployed()

  let Simple7702Account = await hre.ethers.getContractFactory("Simple7702Account");
  let simple7702Account = await Simple7702Account.deploy(entryPoint.address);
  console.log("simple7702Account deployed to:", simple7702Account.address);
  deployed.simple7702Account = simple7702Account.address


  fs.writeFileSync(`deployed/${hre.network.name}.json`, JSON.stringify(deployed, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
