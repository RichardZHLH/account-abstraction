const { ethers } = require('ethers')
const deployedInfo = require('../deployed/WanchainTestnet.json')

// === 配置 ===
const RPC_URL = 'http://192.168.1.179:8545'
const SIMPLE_ACCOUNT_FACTORY_ADDRESS = deployedInfo.simpleAccountFactory
const ENTRY_POINT_ADDRESS = deployedInfo.entryPoint
const SALT = 0

const wallet = new ethers.Wallet(process.env.PK8)
const OWNER_ADDRESS = wallet.address

const FACTORY_ABI = [
  'function getAddress(address owner, uint256 salt) view returns (address)'
]

const ACCOUNT_ABI = [
  'function execute(address target, uint256 value, bytes data)',
  'function getNonce() view returns (uint256)'
]

const ENTRY_POINT_ABI = [
  'function getNonce(address sender, uint192 key) view returns (uint256 nonce)',
  'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)'
]

const FACTORY_INTERFACE = new ethers.utils.Interface([
  'function createAccount(address owner, uint256 salt) returns (address)'
])

function packGasLimits (...args) {
  let ret = '0x'
  for (const arg of args) {
    const padded = ethers.utils.hexZeroPad(arg.toHexString(), 32)
    ret += padded.slice(34)
  }
  return ret
}

async function main () {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const walletConnected = wallet.connect(provider)

  const factory = new ethers.Contract(SIMPLE_ACCOUNT_FACTORY_ADDRESS, FACTORY_ABI, provider)

  const accountAddress = await factory.getAddress(OWNER_ADDRESS, SALT)

  console.log('Owner (EOA):', OWNER_ADDRESS)
  console.log('Salt:', SALT)
  console.log('4337 合约地址:', accountAddress)

  // 检查 4337 账户是否已部署
  const code = await provider.getCode(accountAddress)
  const isDeployed = code !== '0x'
  console.log('4337 账户已部署:', isDeployed)

  // 转 0.01 ETH 到 4337 地址
  const tx = await walletConnected.sendTransaction({
    to: accountAddress,
    value: ethers.utils.parseEther('0.01')
  })
  console.log('转账 tx:', tx.hash)
  await tx.wait()
  console.log('转账完成')

  // === 从 4337 地址转出 0.001 ETH 回 wallet ===
  const account = new ethers.Contract(accountAddress, ACCOUNT_ABI, provider)
  const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, walletConnected)

  // 从 EntryPoint 获取 nonce（无论账户是否已部署都可用）
  const nonce = await entryPoint.getNonce(accountAddress, 0)

  // 如果账户未部署，需要 initCode 让 EntryPoint 在验证时自动部署
  let initCode = '0x'
  if (!isDeployed) {
    initCode = SIMPLE_ACCOUNT_FACTORY_ADDRESS + FACTORY_INTERFACE.encodeFunctionData('createAccount', [OWNER_ADDRESS, SALT]).slice(2)
  }

  const feeData = await provider.getFeeData()
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('1', 'gwei')
  const maxFeePerGas = feeData.maxFeePerGas || maxPriorityFeePerGas.mul(2)

  const callData = account.interface.encodeFunctionData('execute', [
    OWNER_ADDRESS,
    ethers.utils.parseEther('0.001'),
    '0x'
  ])

  const verificationGasLimit = isDeployed ? ethers.BigNumber.from(150000) : ethers.BigNumber.from(300000)
  const callGasLimit = ethers.BigNumber.from(50000)
  const preVerificationGas = ethers.BigNumber.from(100000)

  const userOp = {
    sender: accountAddress,
    nonce: nonce,
    initCode: initCode,
    callData: callData,
    accountGasLimits: packGasLimits(verificationGasLimit, callGasLimit),
    preVerificationGas: preVerificationGas,
    gasFees: packGasLimits(maxPriorityFeePerGas, maxFeePerGas),
    paymasterAndData: '0x',
    signature: '0x'
  }

  const chainId = (await provider.getNetwork()).chainId
  const signature = await wallet._signTypedData(
    {
      name: 'ERC4337',
      version: '1',
      chainId: chainId,
      verifyingContract: ENTRY_POINT_ADDRESS
    },
    {
      PackedUserOperation: [
        { name: 'sender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'initCode', type: 'bytes' },
        { name: 'callData', type: 'bytes' },
        { name: 'accountGasLimits', type: 'bytes32' },
        { name: 'preVerificationGas', type: 'uint256' },
        { name: 'gasFees', type: 'bytes32' },
        { name: 'paymasterAndData', type: 'bytes' }
      ]
    },
    userOp
  )
  userOp.signature = signature

  const tx2 = await entryPoint.handleOps([userOp], OWNER_ADDRESS)
  console.log('UserOp tx:', tx2.hash)
  await tx2.wait()
  console.log('从 4337 地址转出完成')
}

main().catch(console.error)
