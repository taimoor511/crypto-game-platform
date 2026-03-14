const { ethers } = require('ethers');

// USDT BEP20 ABI (minimal - just the functions we need)
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC);
    this.usdtContract = new ethers.Contract(
      process.env.USDT_CONTRACT_ADDRESS,
      USDT_ABI,
      this.provider
    );
    
    // Initialize wallets
    this.depositWallet = new ethers.Wallet(
      process.env.DEPOSIT_WALLET_PRIVATE_KEY,
      this.provider
    );
    this.poolWallet = new ethers.Wallet(
      process.env.POOL_WALLET_PRIVATE_KEY,
      this.provider
    );
    this.rewardWallet = new ethers.Wallet(
      process.env.REWARD_WALLET_PRIVATE_KEY,
      this.provider
    );
  }

  // Get USDT balance of an address
  async getUSDTBalance(address) {
    try {
      const balance = await this.usdtContract.balanceOf(address);
      return ethers.formatUnits(balance, 18); // USDT has 18 decimals on BSC testnet
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      throw error;
    }
  }

  // Send USDT from reward wallet to user
  async sendUSDT(toAddress, amount) {
    try {
      const usdtWithSigner = this.usdtContract.connect(this.rewardWallet);
      const amountInWei = ethers.parseUnits(amount.toString(), 18);
      
      const tx = await usdtWithSigner.transfer(toAddress, amountInWei);
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error sending USDT:', error);
      throw error;
    }
  }

  // Listen for deposits to the deposit wallet
  async listenForDeposits(callback) {
    try {
      const depositAddress = this.depositWallet.address;
      
      // Listen for Transfer events to deposit wallet
      this.usdtContract.on('Transfer', async (from, to, value, event) => {
        if (to.toLowerCase() === depositAddress.toLowerCase()) {
          const amount = ethers.formatUnits(value, 18);
          
          callback({
            from,
            to,
            amount,
            txHash: event.log.transactionHash,
            blockNumber: event.log.blockNumber
          });
        }
      });

      console.log(`Listening for deposits to ${depositAddress}`);
    } catch (error) {
      console.error('Error setting up deposit listener:', error);
      throw error;
    }
  }

  // Get deposit wallet address
  getDepositAddress() {
    return this.depositWallet.address;
  }

  // Get transaction by hash
  async getTransaction(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        blockNumber: receipt ? receipt.blockNumber : null,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending'
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  // Verify a deposit transaction
  async verifyDeposit(txHash, expectedAmount) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) {
        return { valid: false, reason: 'Transaction failed or not found' };
      }

      // Parse Transfer events from the receipt
      const transferEvents = receipt.logs
        .filter(log => log.address.toLowerCase() === process.env.USDT_CONTRACT_ADDRESS.toLowerCase())
        .map(log => {
          try {
            return this.usdtContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event !== null && event.name === 'Transfer');

      // Check if any transfer is to our deposit wallet
      const depositAddress = this.depositWallet.address.toLowerCase();
      const relevantTransfer = transferEvents.find(
        event => event.args.to.toLowerCase() === depositAddress
      );

      if (!relevantTransfer) {
        return { valid: false, reason: 'No transfer to deposit wallet found' };
      }

      const amount = parseFloat(ethers.formatUnits(relevantTransfer.args.value, 18));
      
      if (Math.abs(amount - expectedAmount) > 0.0001) {
        return { 
          valid: false, 
          reason: `Amount mismatch. Expected: ${expectedAmount}, Got: ${amount}` 
        };
      }

      return { 
        valid: true, 
        amount,
        from: relevantTransfer.args.from
      };
    } catch (error) {
      console.error('Error verifying deposit:', error);
      return { valid: false, reason: error.message };
    }
  }
}

module.exports = new BlockchainService();
