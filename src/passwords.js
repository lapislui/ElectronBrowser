const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class PasswordManager {
  constructor() {
    this.passwords = new Map();
    this.encryptionKey = 'your-secure-encryption-key'; // In production, use a secure key management system
    
    // Initialize IPC handlers
    this.initIPCHandlers();
  }

  initIPCHandlers() {
    ipcMain.handle('save-password', async (event, data) => {
      return this.savePassword(data.url, data.username, data.password);
    });

    ipcMain.handle('get-password', async (event, data) => {
      return this.getPassword(data.url, data.username);
    });

    ipcMain.handle('has-saved-password', async (event, url) => {
      return this.hasSavedPassword(url);
    });
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
  }

  decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey),
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  savePassword(url, username, password) {
    try {
      const domain = new URL(url).hostname;
      const encrypted = this.encrypt(password);
      
      this.passwords.set(`${domain}:${username}`, {
        username,
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag
      });
      
      return true;
    } catch (error) {
      console.error('Error saving password:', error);
      return false;
    }
  }

  getPassword(url, username) {
    try {
      const domain = new URL(url).hostname;
      const data = this.passwords.get(`${domain}:${username}`);
      
      if (!data) return null;
      
      return {
        username: data.username,
        password: this.decrypt(data.encrypted, data.iv, data.authTag)
      };
    } catch (error) {
      console.error('Error getting password:', error);
      return null;
    }
  }

  hasSavedPassword(url) {
    try {
      const domain = new URL(url).hostname;
      return Array.from(this.passwords.keys()).some(key => key.startsWith(domain + ':'));
    } catch (error) {
      return false;
    }
  }
}

module.exports = PasswordManager;