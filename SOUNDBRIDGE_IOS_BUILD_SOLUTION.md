# SoundBridge iOS Build Permission Solution

## 🚨 **Problem: EACCES Permission Errors During iOS Prebuild**

SoundBridge is experiencing `EACCES` (permission denied) errors during the iOS prebuild phase, similar to the Windows OneDrive permission issues we resolved for GutCheck.

## 🔍 **Root Cause Analysis**

### **Common Causes of EACCES Errors:**
1. **File System Permissions** - Insufficient read/write permissions
2. **OneDrive Sync Conflicts** - Files locked during sync process
3. **Path Length Issues** - Windows path length limitations
4. **Node Modules Permissions** - Corrupted or locked dependencies
5. **Git Repository Issues** - File permission conflicts in version control

## 🛠️ **Solution: Clean Environment Setup**

### **Step 1: Create Clean Project Location**
```bash
# Create a clean directory outside OneDrive/sync folders
mkdir C:\soundbridge-app
cd C:\soundbridge-app
```

### **Step 2: Clone Repository to Clean Location**
```bash
# Clone your SoundBridge repository
git clone https://github.com/yourusername/soundbridge-app.git .
# OR if using a different Git provider:
git clone https://gitlab.com/yourusername/soundbridge-app.git .
```

### **Step 3: Clean Install Dependencies**
```bash
# Remove existing node_modules and lock files
rm -rf node_modules
rm package-lock.json  # or yarn.lock if using Yarn

# Fresh install with proper permissions
npm install --legacy-peer-deps
# OR if using Yarn:
yarn install
```

### **Step 4: Verify Project Structure**
Ensure all essential files are present:
- `package.json`
- `app.json` or `app.config.js`
- `eas.json` (for EAS builds)
- `src/` directory with your app code
- `assets/` directory with images/icons

## 🔧 **iOS-Specific Fixes**

### **Step 5: Clean iOS Build Cache**
```bash
# Clear Expo cache
npx expo install --fix

# Clear Metro cache
npx expo start --clear

# Clear EAS build cache
npx eas-cli@latest build --platform ios --clear-cache
```

### **Step 6: Fix File Permissions (Windows)**
```bash
# Grant full permissions to the project directory
icacls "C:\soundbridge-app" /grant Everyone:F /T

# OR use takeown to take ownership
takeown /f "C:\soundbridge-app" /r /d y
icacls "C:\soundbridge-app" /grant Everyone:F /T
```

### **Step 7: Update Package Lock File**
```bash
# Ensure package-lock.json is in sync
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "Update package-lock.json for clean build"
git push origin main
```

## 🚀 **Build Commands**

### **For EAS Build (Recommended)**
```bash
# Configure EAS (if not already done)
npx eas-cli@latest build:configure

# Build for iOS
npx eas-cli@latest build --platform ios --profile production
```

### **For Local Build**
```bash
# Start development server
npx expo start

# Build for iOS simulator
npx expo run:ios
```

## 📋 **Troubleshooting Steps**

### **If EACCES Errors Persist:**

1. **Check File Ownership**
   ```bash
   # Windows
   dir "C:\soundbridge-app" /Q
   
   # Ensure your user has full control
   ```

2. **Run as Administrator**
   ```bash
   # Open PowerShell as Administrator
   cd C:\soundbridge-app
   npm install --legacy-peer-deps
   npx eas-cli@latest build --platform ios
   ```

3. **Use WSL (Windows Subsystem for Linux)**
   ```bash
   # Install WSL if not already installed
   wsl --install
   
   # In WSL terminal
   cd /mnt/c/soundbridge-app
   npm install --legacy-peer-deps
   npx eas-cli@latest build --platform ios
   ```

4. **Check Antivirus Software**
   - Temporarily disable real-time scanning
   - Add project directory to exclusions
   - Some antivirus software blocks file operations

## ✅ **Verification Checklist**

Before building, ensure:
- [ ] Project is in `C:\soundbridge-app` (not OneDrive)
- [ ] All dependencies installed successfully
- [ ] No permission errors in terminal
- [ ] Git repository is clean and up to date
- [ ] EAS credentials are configured
- [ ] iOS development certificates are valid

## 🎯 **Expected Results**

After following these steps:
- ✅ No EACCES permission errors
- ✅ Clean prebuild process
- ✅ Successful iOS build
- ✅ App ready for App Store submission

## 📞 **Support**

If issues persist after following these steps:
1. Check the specific error message in the build logs
2. Verify all file paths are correct
3. Ensure no files are locked by other processes
4. Try building from a different user account

## 🔗 **Related Resources**

- [EAS Build Troubleshooting](https://docs.expo.dev/build-reference/troubleshooting/)
- [Expo iOS Build Guide](https://docs.expo.dev/build/introduction/)
- [Windows File Permissions](https://docs.microsoft.com/en-us/windows/security/identity-protection/access-control/access-control)

---

**Last Updated**: December 2024  
**Status**: Ready for iOS build  
**Tested**: Successfully resolved similar issues for GutCheck app
