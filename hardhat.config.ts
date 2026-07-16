import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import { HardhatUserConfig, task } from 'hardhat/config'
import 'hardhat-deploy'

import * as fs from 'fs'

const SALT = '0x7702864008ddeab30aa67b7adc3d2653bc8d162714b1fe8fe4582df814f3bf61'
process.env.SALT = process.env.SALT ?? SALT

task('deploy', 'Deploy contracts')
  .addFlag('simpleAccountFactory', 'deploy sample factory (by default, enabled only on localhost)')

const mnemonicFileName = process.env.MNEMONIC_FILE!
let mnemonic = 'test '.repeat(11) + 'junk'
if (fs.existsSync(mnemonicFileName)) { mnemonic = fs.readFileSync(mnemonicFileName, 'ascii') }

function getNetwork1 (url: string): { url: string, accounts: { mnemonic: string } } {
  return {
    url,
    accounts: { mnemonic }
  }
}

function getNetwork (name: string): { url: string, accounts: { mnemonic: string } } {
  return getNetwork1(`https://${name}.infura.io/v3/${process.env.INFURA_ID}`)
  // return getNetwork1(`wss://${name}.infura.io/ws/v3/${process.env.INFURA_ID}`)
}

const optimizedCompilerSettings = {
  version: '0.8.28',
  settings: {
    evmVersion: 'london',
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{
      version: '0.8.28',
      settings: {
        evmVersion: 'london',
        viaIR: true,
        optimizer: { enabled: true, runs: 1000000 }
      }
    }],
    overrides: {
      'contracts/core/EntryPoint.sol': optimizedCompilerSettings,
      'contracts/core/EntryPointSimulations.sol': optimizedCompilerSettings,
      'contracts/accounts/SimpleAccount.sol': optimizedCompilerSettings
    }
  },
  networks: {
    dev: { url: 'http://localhost:8545' },
    WanchainTestnet:{
      url: "http://192.168.1.179:8545",
      chainId: 999,
      gasPrice: 3e9,
      accounts: ["0x949077a1ad13215b0436b748f6afb07b837aebbe1038bc1e48ebdac49782f8b0"]
    },
    // github action starts localgeth service, for gas calculations
    localgeth: { url: 'http://localgeth:8545' },
    sepolia: getNetwork('sepolia'),
    proxy: getNetwork1('http://localhost:8545')
  },
  mocha: {
    timeout: 10000
  }
}

export default config
