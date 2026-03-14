import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Wallet APIs
export const getDepositAddress = () => api.get('/api/wallet/deposit-address');
export const requestWithdrawal = (amount, walletAddress) => 
  api.post('/api/wallet/withdraw', { amount, walletAddress });
export const getTransactions = (params) => api.get('/api/wallet/transactions', { params });
export const verifyDeposit = (txHash) => api.post('/api/wallet/verify-deposit', { txHash });

export default api;
